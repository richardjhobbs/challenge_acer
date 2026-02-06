import type { BestSolution } from './types';

interface MemoEntry {
  value: number;
  expr: string;
}

export function computeBestSolution(tiles: number[], target: number): BestSolution | null {
  const n = tiles.length;
  const memo = new Map<number, Map<number, string>>();

  const getMap = (mask: number) => {
    if (!memo.has(mask)) memo.set(mask, new Map());
    return memo.get(mask)!;
  };

  const outSet = (map: Map<number, string>, value: number, expr: string) => {
    if (!Number.isInteger(value)) return;
    if (value <= 0) return;
    if (value > 50000) return;
    if (!map.has(value)) map.set(value, expr);
  };

  for (let i = 0; i < n; i += 1) {
    const mask = 1 << i;
    getMap(mask).set(tiles[i], String(tiles[i]));
  }

  for (let mask = 1; mask < 1 << n; mask += 1) {
    for (let a = (mask - 1) & mask; a > 0; a = (a - 1) & mask) {
      const b = mask ^ a;
      if (b === 0) continue;
      if (a > b) continue;

      const mapA = getMap(a);
      const mapB = getMap(b);
      if (!mapA.size || !mapB.size) continue;

      const out = getMap(mask);
      for (const [va, ea] of mapA.entries()) {
        for (const [vb, eb] of mapB.entries()) {
          outSet(out, va + vb, `(${ea}+${eb})`);
          outSet(out, va * vb, `(${ea}*${eb})`);

          if (va > vb) outSet(out, va - vb, `(${ea}-${eb})`);
          if (vb > va) outSet(out, vb - va, `(${eb}-${ea})`);

          if (vb !== 0 && va % vb === 0) outSet(out, va / vb, `(${ea}/${eb})`);
          if (va !== 0 && vb % va === 0) outSet(out, vb / va, `(${eb}/${ea})`);
        }
      }
    }
  }

  let best: BestSolution | null = null;
  for (let mask = 1; mask < 1 << n; mask += 1) {
    const map = getMap(mask);
    for (const [value, expr] of map.entries()) {
      const diff = Math.abs(target - value);
      if (!best || diff < best.diff) {
        best = { value, expr, diff };
      }
      if (best && best.diff === 0) return best;
    }
  }

  return best;
}
