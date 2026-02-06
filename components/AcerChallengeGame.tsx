'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HowToPlay from '@/components/HowToPlay';
import HistoryTable from '@/components/HistoryTable';
import TargetDisplay from '@/components/TargetDisplay';
import TilesBoard from '@/components/TilesBoard';
import { applyOperation, scoreForDiff } from '@/lib/rules';
import { computeBestSolution } from '@/lib/solver';
import { clearHistory, loadHistory, saveHistory } from '@/lib/storage';
import { createSeededRng, randInt, shuffle } from '@/lib/rng';
import { getSpeechStatus, isSpeechSupported, pickVoice, speakText } from '@/lib/voice';
import type { BestSolution, GamePhase, HistoryItem, Operation, Tile } from '@/lib/types';

const LARGE_POOL = [25, 50, 75, 100];
const SMALL_POOL = Array.from({ length: 10 }, (_, i) => i + 1).flatMap((n) => [n, n]);

interface UndoSnapshot {
  tiles: Tile[];
  workLines: string[];
  lockedId: string | null;
}

const DEFAULT_DIGITS = [
  { value: '-', locked: false },
  { value: '-', locked: false },
  { value: '-', locked: false }
];

// Round payload shape for future server sync (tiles, target, optional seed).
const roundPayloadNote = {
  tiles: 'tiles',
  target: 'target',
  seed: 'seed'
};

export default function AcerChallengeGame() {
  const rng = useMemo(() => createSeededRng(), []);
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [tilesAtStart, setTilesAtStart] = useState<Tile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [workLines, setWorkLines] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [digits, setDigits] = useState(DEFAULT_DIGITS);
  const [targetHint, setTargetHint] = useState('Reveal the round to generate a target.');
  const [timerMode, setTimerMode] = useState(30);
  const [largeCount, setLargeCount] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerHint, setTimerHint] = useState('Timer does not start automatically.');
  const [feedback, setFeedback] = useState<{ tone: 'good' | 'bad' | 'muted'; message: string } | null>(null);
  const [bestAnswer, setBestAnswer] = useState<BestSolution | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [speechNote, setSpeechNote] = useState<string | null>(null);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const revealAbortRef = useRef(false);

  const isRevealing = phase === 'REVEALING_TILES';
  const isTargetRolling = phase === 'TARGET_ROLLING';
  const roundActive = phase !== 'IDLE' && phase !== 'ENDED';

  const canOperate = roundActive && !isRevealing && !isTargetRolling && selectedIds.length === 2;
  const canLockIn = roundActive && !isRevealing && !isTargetRolling && selectedIds.length === 1;
  const canUndo = roundActive && !isRevealing && !isTargetRolling && undoStack.length > 1;
  const canReset = roundActive && !isRevealing && !isTargetRolling && (undoStack.length > 1 || workLines.length > 0);
  const canStartTimer = phase === 'READY' && target !== null;
  const roundStateText = phase === 'IDLE' ? 'Not started' : roundActive ? 'In play' : 'Round ended';

  const workMeta = roundActive ? `Tiles remaining: ${tiles.length}` : '';

  const pickHint = useMemo(() => {
    if (!roundActive) return 'Click “Reveal round” to begin.';
    if (isRevealing) return 'Revealing tiles...';
    if (isTargetRolling) return 'Generating target...';
    if (selectedIds.length === 0) return 'Select two tiles, then choose an operation.';
    if (selectedIds.length === 1) return 'Select one more tile, or lock in this tile as your final answer.';
    return 'Choose an operation.';
  }, [roundActive, isRevealing, isTargetRolling, selectedIds.length]);

  const timeDisplay = useMemo(() => {
    if (timeRemaining === null) return '--';
    if (timerMode === 0) return 'Unlimited';
    const sec = Math.max(timeRemaining, 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  }, [timeRemaining, timerMode]);

  const announce = useCallback(
    (text: string) => {
      if (!isSpeechSupported()) return;
      speakText(text, voice);
    },
    [voice]
  );

  const announceCountdown = useCallback(
    (text: string) => {
      if (!isSpeechSupported()) return;
      speakText(text, voice, { interrupt: true });
    },
    [voice]
  );

  const resetTarget = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setTarget(null);
    setDigits(DEFAULT_DIGITS);
    setTargetHint('Reveal the round to generate a target.');
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setHistoryItems(loadHistory());
    if (!isSpeechSupported()) {
      setSpeechNote('Speech synthesis not available in this browser.');
      return;
    }
    const status = getSpeechStatus();
    if (!status.hasVoices) {
      setSpeechNote('Speech voices are still loading. Try again shortly.');
    }
    const syncVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const picked = pickVoice(voices);
      setVoice(picked);
      if (!picked) {
        setSpeechNote('No English voice found. Speech will fall back silently.');
      } else {
        setSpeechNote(null);
      }
    };
    syncVoices();
    window.speechSynthesis.onvoiceschanged = () => syncVoices();
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => () => {
    stopTimer();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    revealAbortRef.current = true;
  }, [stopTimer]);

  const createTileId = useCallback(() => {
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      const buffer = new Uint32Array(2);
      crypto.getRandomValues(buffer);
      return Array.from(buffer)
        .map((n) => n.toString(16))
        .join('');
    }
    return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  }, []);

  const drawTiles = useCallback(
    (largeCount: number) => {
      const smallCount = 6 - largeCount;
      const large = shuffle(rng, LARGE_POOL).slice(0, largeCount);
      const small = shuffle(rng, SMALL_POOL).slice(0, smallCount);

      return shuffle(rng, [
        ...large.map((value) => ({ value, kind: 'large' as const })),
        ...small.map((value) => ({ value, kind: 'small' as const }))
      ]).map((tile) => ({
        id: createTileId(),
        value: tile.value,
        kind: tile.kind,
        revealed: false
      }));
    },
    [createTileId, rng]
  );

  const pushUndo = useCallback((nextTiles: Tile[], nextWork: string[], nextLocked: string | null) => {
    setUndoStack((prev) => [...prev, { tiles: nextTiles.map((tile) => ({ ...tile })), workLines: nextWork, lockedId: nextLocked }]);
  }, []);

  const handleTileClick = (id: string) => {
    if (!roundActive || isRevealing || isTargetRolling) return;
    const tile = tiles.find((item) => item.id === id);
    if (!tile || !tile.revealed) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      const next = prev.length >= 2 ? prev.slice(1) : prev.slice();
      next.push(id);
      return next;
    });
    if (lockedId && lockedId !== id) setLockedId(null);
  };

  const handleOperation = (op: Operation) => {
    if (!canOperate) return;
    const [firstId, secondId] = selectedIds;
    const first = tiles.find((tile) => tile.id === firstId);
    const second = tiles.find((tile) => tile.id === secondId);
    if (!first || !second || !first.revealed || !second.revealed) return;

    try {
      const result = applyOperation(first.value, second.value, op);
      pushUndo(tiles, workLines.slice(), lockedId);

      const remaining = tiles.filter((tile) => tile.id !== firstId && tile.id !== secondId);
      const nextTiles = [...remaining, { id: createTileId(), value: result.value, kind: 'result', revealed: true }];
      setTiles(nextTiles);
      setSelectedIds([]);
      setLockedId(null);
      setWorkLines((prev) => [...prev, result.expression]);
      setFeedback({ tone: 'good', message: `OK ${result.expression}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFeedback({ tone: 'bad', message: `Not allowed ${message}` });
    }
  };

  const handleUndo = () => {
    if (!canUndo) return;
    setUndoStack((prev) => {
      const nextStack = prev.slice(0, -1);
      const snapshot = nextStack[nextStack.length - 1];
      setTiles(snapshot.tiles.map((tile) => ({ ...tile })));
      setWorkLines(snapshot.workLines.slice());
      setLockedId(snapshot.lockedId);
      setSelectedIds([]);
      setFeedback({ tone: 'muted', message: 'Undone.' });
      return nextStack;
    });
  };

  const handleReset = () => {
    if (!canReset) return;
    setUndoStack((prev) => {
      const base = prev[0];
      setTiles(base.tiles.map((tile) => ({ ...tile })));
      setWorkLines([]);
      setLockedId(null);
      setSelectedIds([]);
      setFeedback({ tone: 'muted', message: 'Reset.' });
      return [base];
    });
  };

  const computeBest = useCallback(
    (sourceTiles: Tile[], targetValue: number) => {
      const best = computeBestSolution(sourceTiles.map((tile) => tile.value), targetValue);
      setBestAnswer(best);
      return best;
    },
    []
  );

  const lockInAnswer = () => {
    if (!canLockIn || target === null) return;
    const selected = tiles.find((tile) => tile.id === selectedIds[0]);
    if (!selected) return;

    setLockedId(selected.id);
    stopTimer();
    setPhase('ENDED');

    const diff = Math.abs(target - selected.value);
    const points = scoreForDiff(diff);
    const best = computeBest(tilesAtStart.length ? tilesAtStart : tiles, target);

    setFeedback({
      tone: 'good',
      message: `Locked in. Value: ${selected.value}, diff: ${diff}, points: ${points}`
    });

    saveHistory({
      ts: Date.now(),
      tiles: tilesAtStart.map((tile) => tile.value),
      target,
      steps: workLines.slice(),
      userValue: selected.value,
      bestValue: best ? best.value : null,
      points
    });

    setHistoryItems(loadHistory());
  };

  const handleTimeUp = useCallback(() => {
    stopTimer();
    setPhase('ENDED');
    setFeedback({ tone: 'bad', message: 'Time.' });
    if (target !== null) {
      computeBest(tilesAtStart.length ? tilesAtStart : tiles, target);
    }
  }, [computeBest, stopTimer, target, tiles, tilesAtStart]);

  const startTimer = () => {
    if (!canStartTimer) return;
    setPhase('RUNNING');
    setTimeRemaining(timerMode);
    setTimerHint(timerMode === 0 ? 'Unlimited' : 'Timer running');

    if (timerMode === 0) return;
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return prev;
        const next = prev - 1;
        if (next <= 5 && next >= 1) {
          announceCountdown(String(next));
        }
        if (next <= 0) {
          handleTimeUp();
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const rollTargetAndFix = useCallback(
    () =>
      new Promise<number>((resolve) => {
        setPhase('TARGET_ROLLING');
        const final1 = randInt(rng, 1, 9);
        const final2 = randInt(rng, 0, 9);
        const final3 = randInt(rng, 0, 9);
        const finalTarget = final1 * 100 + final2 * 10 + final3;

        const start = performance.now();
        let lock1 = false;
        let lock2 = false;
        let lock3 = false;

        const tick = (now: number) => {
          if (revealAbortRef.current) return;
          const elapsed = (now - start) / 1000;

          if (elapsed >= 4 && !lock1) {
            lock1 = true;
            setDigits((prev) => [
              { value: String(final1), locked: true },
              prev[1],
              prev[2]
            ]);
          }
          if (elapsed >= 6 && !lock2) {
            lock2 = true;
            setDigits((prev) => [prev[0], { value: String(final2), locked: true }, prev[2]]);
          }
          if (elapsed >= 7 && !lock3) {
            lock3 = true;
            setDigits((prev) => [prev[0], prev[1], { value: String(final3), locked: true }]);
          }

          if (!lock1) {
            setDigits((prev) => [
              { value: String(randInt(rng, 0, 9)), locked: false },
              prev[1],
              prev[2]
            ]);
          }
          if (!lock2) {
            setDigits((prev) => [prev[0], { value: String(randInt(rng, 0, 9)), locked: false }, prev[2]]);
          }
          if (!lock3) {
            setDigits((prev) => [prev[0], prev[1], { value: String(randInt(rng, 0, 9)), locked: false }]);
          }

          if (lock3) {
            setTarget(finalTarget);
            setPhase('READY');
            resolve(finalTarget);
            return;
          }
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      }),
    [rng]
  );

  const revealRound = async (largeCount: number) => {
    if (isRevealing || isTargetRolling) return;
    revealAbortRef.current = false;

    announce("Select how many large numbers and let’s go");

    const smallCount = 6 - largeCount;
    announce(`That’s ${largeCount} large and ${smallCount} small numbers`);

    stopTimer();
    setTimeRemaining(null);
    setTimerHint('Timer does not start automatically.');
    setFeedback(null);
    setBestAnswer(null);
    setSelectedIds([]);
    setLockedId(null);
    setWorkLines([]);
    setUndoStack([]);
    resetTarget();

    setPhase('REVEALING_TILES');
    const freshTiles = drawTiles(largeCount);
    setTiles(freshTiles);
    setTilesAtStart(freshTiles.map((tile) => ({ ...tile })));
    setUndoStack([{ tiles: freshTiles.map((tile) => ({ ...tile })), workLines: [], lockedId: null }]);

    for (let i = 0; i < freshTiles.length; i += 1) {
      await new Promise((res) => setTimeout(res, 1000));
      setTiles((prev) =>
        prev.map((tile, index) => (index === i ? { ...tile, revealed: true } : tile))
      );
    }

    setPhase('TARGET_ROLLING');
    await new Promise((res) => setTimeout(res, 2000));
    announce('And the number is');
    const finalTarget = await rollTargetAndFix();
    announce(String(finalTarget));
    setTargetHint('Press Start timer when you are ready.');
  };

  const revealRoundWithInput = (largeCount: number) => {
    void revealRound(largeCount);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistoryItems([]);
  };

  const bestAnswerView = bestAnswer ? (
    <>
      <div>
        <span className={bestAnswer.diff === 0 ? 'good' : ''}>Best: {bestAnswer.value}</span> (diff {bestAnswer.diff})
      </div>
      <div className="mono">{bestAnswer.expr}</div>
    </>
  ) : (
    '---'
  );

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Acer Challenge</h1>
          <div className="muted">
            Pick your numbers, reveal the tiles, reveal the target, then start the clock when you are ready.
          </div>
        </div>
        <div className="muted">
          Voice uses your browser voice list, best effort UK English female.
          {speechNote ? ` ${speechNote}` : ''}
        </div>
      </div>

      <div className="stage">
        <div className="controls">
          <div>
            <label htmlFor="largeCount">Large numbers (0–4)</label>
            <select id="largeCount" value={largeCount} onChange={(event) => setLargeCount(Number(event.target.value))}>
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          <div>
            <label htmlFor="smallCount">Small numbers (auto so total = 6)</label>
            <input id="smallCount" type="number" value={6 - largeCount} disabled />
          </div>
          <div>
            <label htmlFor="timerMode">Timer</label>
            <select id="timerMode" value={timerMode} onChange={(event) => setTimerMode(Number(event.target.value))}>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={0}>Unlimited</option>
            </select>
          </div>

          <div className="rowRight">
            <button id="newRoundBtn" onClick={() => revealRoundWithInput(largeCount)}>
              Reveal round
            </button>
            <button id="startTimerBtn" className="btnDanger" disabled={!canStartTimer} onClick={startTimer}>
              Start timer
            </button>
            <button id="undoBtn" className="btnGhost" disabled={!canUndo} onClick={handleUndo}>
              Undo
            </button>
            <button id="resetWorkBtn" className="btnGhost" disabled={!canReset} onClick={handleReset}>
              Reset work
            </button>
            <button id="lockInBtn" className="btnGhost" disabled={!canLockIn} onClick={lockInAnswer}>
              Lock in selected tile
            </button>
          </div>
        </div>

        <div className="arena">
          <div className="displayRow">
            <TargetDisplay digits={digits} hint={targetHint} />

            <TilesBoard
              tiles={tiles}
              selectedIds={selectedIds}
              lockedId={lockedId}
              onTileClick={handleTileClick}
              hint={pickHint}
              canOperate={canOperate}
              onOperation={handleOperation}
            />

            <div className="box">
              <div className="muted">Time</div>
              <div className="led">
                <span>{timeDisplay}</span>
              </div>
              <div className="smallNote">{timerHint}</div>
            </div>
          </div>

          <div className="statusRow">
            <div className="statusBox">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <b>Working</b>
                <span className="muted">{workMeta}</span>
              </div>
              <div style={{ height: 10 }} />
              <div className="workArea">{workLines.length ? workLines.join('\n') : 'No steps yet.'}</div>
            </div>

            <div className="statusBox">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <b>Round result</b>
                <span className="muted">{roundStateText}</span>
              </div>
              <div style={{ height: 10 }} />
              <div className="mono">
                {feedback ? <span className={feedback.tone}>{feedback.message}</span> : null}
              </div>
              <div style={{ height: 12 }} />
              <div style={{ fontWeight: 800 }}>Best answer (computed)</div>
              <div className="muted">Shown after you lock in, or when time ends.</div>
              <div style={{ height: 10 }} />
              <div className="mono">{bestAnswerView}</div>
            </div>
          </div>

          <HistoryTable items={historyItems} onClear={handleClearHistory} />
          <HowToPlay />
        </div>
      </div>

      <div className="smallNote">
        Multiplayer readiness: seed-based RNG hooks and round payload shape ({roundPayloadNote.tiles},{' '}
        {roundPayloadNote.target},{' '}{roundPayloadNote.seed}) are ready for server sync and validation.
      </div>
    </>
  );
}
