import { PATHFINDERS } from "../algorithms";
import { BattleOrchestrator } from "../battle/battle-orchestrator";
import { createGrid } from "../core/grid";
import type { AlgorithmId, GridModel, PathfinderMetrics } from "../core/types";

export interface BenchmarkCase {
  readonly name: string;
  readonly grid: GridModel;
  readonly algorithms: readonly AlgorithmId[];
}

export interface BenchmarkReport {
  readonly name: string;
  readonly metrics: readonly PathfinderMetrics[];
  readonly fastest: AlgorithmId;
  readonly mostEfficient: AlgorithmId;
}

export class BenchmarkEngine {
  private readonly orchestrator = new BattleOrchestrator();

  run(benchmark: BenchmarkCase): BenchmarkReport {
    const battle = this.orchestrator.run(benchmark.grid, { algorithms: benchmark.algorithms });
    const metrics = battle.contestants.map((contestant) => contestant.result.metrics);
    const fallback = benchmark.algorithms[0];
    if (!fallback) {
      throw new Error("Benchmark requires at least one algorithm");
    }
    const fastest = [...metrics].sort((a, b) => a.durationMs - b.durationMs)[0]?.algorithm ?? fallback;
    return {
      name: benchmark.name,
      metrics,
      fastest,
      mostEfficient: battle.winner.algorithm
    };
  }
}

export const createDefaultBenchmark = (): BenchmarkCase => {
  const walls = Array.from({ length: 34 }, (_, index) => ({ x: 12, y: index })).filter((position) => position.y !== 20);
  return {
    name: "Command grid 48x34",
    grid: createGrid(48, 34, { x: 2, y: 2 }, { x: 44, y: 30 }, walls),
    algorithms: PATHFINDERS
  };
};
