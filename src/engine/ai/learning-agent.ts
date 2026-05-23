import type { GridModel } from "../core/types";
import { NeuralLearningEngine, type NeuralLearningSnapshot } from "./neural-learning-engine";

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
  readonly neural: NeuralLearningSnapshot;
}

export class LearningAgent {
  private readonly neuralEngine = new NeuralLearningEngine();

  train(grid: GridModel, epochs = 60): LearningSnapshot {
    const neural = this.neuralEngine.train(grid, { epochs });
    return {
      epochs: neural.epochs.map((epoch) => ({
        epoch: epoch.epoch,
        reward: epoch.reward,
        explorationRate: epoch.explorationRate,
        confidence: epoch.confidence,
        steps: epoch.steps
      })),
      heatmap: neural.heatmap,
      confidence: neural.confidence,
      neural
    };
  }
}
