import { getNeighbors, positionKey, samePosition } from "../core/grid";
import type { GridModel, GridPosition } from "../core/types";

export interface TrainingEpoch {
  readonly epoch: number;
  readonly reward: number;
  readonly explorationRate: number;
  readonly confidence: number;
  readonly steps: number;
}

export interface LearningSnapshot {
  readonly epochs: readonly TrainingEpoch[];
  readonly heatmap: ReadonlyMap<string, number>;
  readonly confidence: number;
}

export class LearningAgent {
  private readonly qValues = new Map<string, number>();
  private readonly visits = new Map<string, number>();
  private readonly epochs: TrainingEpoch[] = [];

  train(grid: GridModel, epochs = 60): LearningSnapshot {
    for (let epoch = 1; epoch <= epochs; epoch += 1) {
      const explorationRate = Math.max(0.05, 0.85 * Math.exp(-epoch / 24));
      let position = grid.start;
      let reward = 0;
      let steps = 0;

      while (!samePosition(position, grid.target) && steps < grid.width * grid.height) {
        steps += 1;
        const next = this.chooseNext(grid, position, explorationRate);
        if (!next) break;
        const key = positionKey(next);
        const prior = this.qValues.get(key) ?? 0;
        const stepReward = samePosition(next, grid.target) ? 100 : next.kind === "weight" ? -next.weight : -1;
        this.qValues.set(key, prior + 0.15 * (stepReward - prior));
        this.visits.set(key, (this.visits.get(key) ?? 0) + 1);
        reward += stepReward;
        position = next;
      }

      const confidence = this.computeConfidence(grid);
      this.epochs.push({ epoch: this.epochs.length + 1, reward, explorationRate, confidence, steps });
    }

    return { epochs: [...this.epochs], heatmap: new Map(this.visits), confidence: this.computeConfidence(grid) };
  }

  private chooseNext(grid: GridModel, position: GridPosition, explorationRate: number) {
    const neighbors = getNeighbors(grid, position);
    if (neighbors.length === 0) return undefined;
    if (Math.random() < explorationRate) {
      return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    return [...neighbors].sort((a, b) => (this.qValues.get(positionKey(b)) ?? 0) - (this.qValues.get(positionKey(a)) ?? 0))[0];
  }

  private computeConfidence(grid: GridModel): number {
    const targetSignal = this.qValues.get(positionKey(grid.target)) ?? 0;
    const visitedRatio = this.visits.size / Math.max(grid.width * grid.height, 1);
    return Math.max(0, Math.min(1, targetSignal / 100 + visitedRatio * 0.35));
  }
}
