export type AlgorithmId =
  | "astar"
  | "dijkstra"
  | "bfs"
  | "dfs"
  | "greedy"
  | "bidirectional";

export type CellKind = "empty" | "wall" | "weight" | "start" | "target";

export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

export interface GridCell extends GridPosition {
  readonly kind: CellKind;
  readonly weight: number;
}

export interface GridModel {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly GridCell[];
  readonly start: GridPosition;
  readonly target: GridPosition;
}

export type PathfinderEventType =
  | "queued"
  | "visited"
  | "relaxed"
  | "frontier"
  | "path"
  | "rejected";

export interface PathfinderEvent {
  readonly type: PathfinderEventType;
  readonly algorithm: AlgorithmId;
  readonly position: GridPosition;
  readonly cost: number;
  readonly depth: number;
  readonly timestamp: number;
}

export interface PathfinderMetrics {
  readonly algorithm: AlgorithmId;
  readonly durationMs: number;
  readonly visitedNodes: number;
  readonly queuedNodes: number;
  readonly pathCost: number;
  readonly pathLength: number;
  readonly memoryBytes: number;
}

export interface PathfinderResult {
  readonly algorithm: AlgorithmId;
  readonly path: readonly GridPosition[];
  readonly events: readonly PathfinderEvent[];
  readonly metrics: PathfinderMetrics;
  readonly reached: boolean;
}

export interface PathfinderOptions {
  readonly allowDiagonal?: boolean;
  readonly maxIterations?: number;
}

export interface Pathfinder {
  readonly id: AlgorithmId;
  run(grid: GridModel, options?: PathfinderOptions): PathfinderResult;
}

export interface BattleContestant {
  readonly algorithm: AlgorithmId;
  readonly result: PathfinderResult;
  readonly score: number;
  readonly rank: number;
}

export interface BattleResult {
  readonly id: string;
  readonly contestants: readonly BattleContestant[];
  readonly winner: BattleContestant;
  readonly startedAt: number;
  readonly completedAt: number;
}
