export type TileKind = 'large' | 'small' | 'result';

export interface Tile {
  id: string;
  value: number;
  kind: TileKind;
  revealed: boolean;
}

export type Operation = '+' | '-' | '*' | '/';

export type GamePhase = 'IDLE' | 'REVEALING_TILES' | 'TARGET_ROLLING' | 'READY' | 'RUNNING' | 'ENDED';

export interface HistoryItem {
  ts: number;
  tiles: number[];
  target: number;
  steps: string[];
  userValue: number | null;
  bestValue: number | null;
  points: number;
}

export interface BestSolution {
  value: number;
  expr: string;
  diff: number;
}

export interface RoundPayload {
  tiles: number[];
  target: number;
  seed?: string;
}
