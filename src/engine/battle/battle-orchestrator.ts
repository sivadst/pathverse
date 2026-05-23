import { createPathfinder } from "../algorithms";
import type { AlgorithmId, BattleContestant, BattleResult, GridModel, PathfinderResult } from "../core/types";
import { TelemetryEngine } from "../telemetry/telemetry-engine";

export interface BattleOptions {
  readonly algorithms: readonly AlgorithmId[];
  readonly telemetry?: TelemetryEngine;
}

const scoreResult = (result: PathfinderResult): number => {
  if (!result.reached) return 0;
  const speedScore = 10_000 / Math.max(result.metrics.durationMs, 0.1);
  const pathScore = 5_000 / Math.max(result.metrics.pathCost, 1);
  const explorationScore = 3_000 / Math.max(result.metrics.visitedNodes, 1);
  return Math.round(speedScore + pathScore + explorationScore);
};

export class BattleOrchestrator {
  run(grid: GridModel, options: BattleOptions): BattleResult {
    const startedAt = performance.now();
    const ranked = options.algorithms
      .map((algorithm) => {
        const result = createPathfinder(algorithm).run(grid);
        options.telemetry?.recordAlgorithm(result.metrics);
        return { algorithm, result, score: scoreResult(result), rank: 0 };
      })
      .sort((a, b) => b.score - a.score)
      .map<BattleContestant>((contestant, index) => ({ ...contestant, rank: index + 1 }));

    const winner = ranked[0];
    if (!winner) {
      throw new Error("Battle requires at least one algorithm");
    }

    return {
      id: crypto.randomUUID(),
      contestants: ranked,
      winner,
      startedAt,
      completedAt: performance.now()
    };
  }
}
