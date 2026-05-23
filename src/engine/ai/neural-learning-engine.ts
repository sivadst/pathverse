import { getNeighbors, manhattanDistance, positionKey, samePosition } from "../core/grid";
import type { GridCell, GridModel, GridPosition, PathfinderEvent } from "../core/types";

export type NeuralAction = "north" | "south" | "east" | "west";

export interface NeuralTrainingOptions {
  readonly epochs: number;
  readonly learningRate?: number;
  readonly discountFactor?: number;
  readonly initialExploration?: number;
  readonly minExploration?: number;
  readonly explorationDecay?: number;
  readonly maxStepsPerEpoch?: number;
}

export interface NeuralTrainingEpoch {
  readonly epoch: number;
  readonly reward: number;
  readonly explorationRate: number;
  readonly confidence: number;
  readonly steps: number;
  readonly pathCost: number;
  readonly failures: number;
  readonly convergenceDelta: number;
}

export interface NeuralCellSignal extends GridPosition {
  readonly confidence: number;
  readonly visits: number;
  readonly reward: number;
  readonly obstacleRisk: number;
  readonly prediction: number;
}

export interface NeuralMemorySnapshot {
  readonly qValues: ReadonlyMap<string, number>;
  readonly visits: ReadonlyMap<string, number>;
  readonly obstacleMemory: ReadonlyMap<string, number>;
  readonly rewardMemory: ReadonlyMap<string, number>;
  readonly bestPath: readonly GridPosition[];
  readonly failures: number;
  readonly version: number;
}

export interface NeuralLearningSnapshot {
  readonly epochs: readonly NeuralTrainingEpoch[];
  readonly heatmap: ReadonlyMap<string, number>;
  readonly cellSignals: readonly NeuralCellSignal[];
  readonly bestPath: readonly GridPosition[];
  readonly predictionField: readonly NeuralCellSignal[];
  readonly events: readonly PathfinderEvent[];
  readonly confidence: number;
  readonly convergence: number;
  readonly memory: NeuralMemorySnapshot;
}

interface EpisodeStep {
  readonly from: GridPosition;
  readonly to: GridCell;
  readonly action: NeuralAction;
  readonly reward: number;
}

const actions: Record<NeuralAction, GridPosition> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 }
};

const actionKey = (position: GridPosition, action: NeuralAction): string => `${positionKey(position)}>${action}`;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export class NeuralLearningEngine {
  private readonly qValues = new Map<string, number>();
  private readonly visits = new Map<string, number>();
  private readonly obstacleMemory = new Map<string, number>();
  private readonly rewardMemory = new Map<string, number>();
  private readonly epochs: NeuralTrainingEpoch[] = [];
  private bestPath: readonly GridPosition[] = [];
  private failures = 0;
  private version = 0;

  train(grid: GridModel, options: NeuralTrainingOptions): NeuralLearningSnapshot {
    const learningRate = options.learningRate ?? 0.22;
    const discountFactor = options.discountFactor ?? 0.84;
    const initialExploration = options.initialExploration ?? 0.82;
    const minExploration = options.minExploration ?? 0.04;
    const explorationDecay = options.explorationDecay ?? 0.035;
    const maxSteps = options.maxStepsPerEpoch ?? grid.width * grid.height;

    for (let localEpoch = 0; localEpoch < options.epochs; localEpoch += 1) {
      const epoch = this.epochs.length + 1;
      const explorationRate = Math.max(minExploration, initialExploration * Math.exp(-epoch * explorationDecay));
      const episode = this.runEpisode(grid, explorationRate, maxSteps);
      const beforeConfidence = this.computeConfidence(grid);
      this.learnFromEpisode(grid, episode.steps, learningRate, discountFactor);
      const confidence = this.computeConfidence(grid);
      const convergenceDelta = Math.abs(confidence - beforeConfidence);

      if (!episode.reached) {
        this.failures += 1;
      } else if (this.bestPath.length === 0 || episode.path.length < this.bestPath.length) {
        this.bestPath = episode.path;
      }

      this.epochs.push({
        epoch,
        reward: episode.reward,
        explorationRate,
        confidence,
        steps: episode.steps.length,
        pathCost: episode.pathCost,
        failures: this.failures,
        convergenceDelta
      });
    }

    this.version += 1;
    return this.snapshot(grid);
  }

  snapshot(grid: GridModel): NeuralLearningSnapshot {
    const cellSignals = this.computeCellSignals(grid);
    const bestPath = this.bestPath.length > 0 ? this.bestPath : this.estimateFuturePath(grid);
    return {
      epochs: [...this.epochs],
      heatmap: new Map(this.visits),
      cellSignals,
      bestPath,
      predictionField: cellSignals.filter((signal) => signal.prediction > 0.18),
      events: this.pathToEvents(bestPath),
      confidence: this.computeConfidence(grid),
      convergence: this.computeConvergence(),
      memory: {
        qValues: new Map(this.qValues),
        visits: new Map(this.visits),
        obstacleMemory: new Map(this.obstacleMemory),
        rewardMemory: new Map(this.rewardMemory),
        bestPath,
        failures: this.failures,
        version: this.version
      }
    };
  }

  restore(memory: NeuralMemorySnapshot): void {
    this.qValues.clear();
    this.visits.clear();
    this.obstacleMemory.clear();
    this.rewardMemory.clear();
    for (const [key, value] of memory.qValues) this.qValues.set(key, value);
    for (const [key, value] of memory.visits) this.visits.set(key, value);
    for (const [key, value] of memory.obstacleMemory) this.obstacleMemory.set(key, value);
    for (const [key, value] of memory.rewardMemory) this.rewardMemory.set(key, value);
    this.bestPath = memory.bestPath;
    this.failures = memory.failures;
    this.version = memory.version;
  }

  private runEpisode(grid: GridModel, explorationRate: number, maxSteps: number) {
    const steps: EpisodeStep[] = [];
    const path: GridPosition[] = [grid.start];
    const seen = new Map<string, number>();
    let position = grid.start;
    let reward = 0;
    let pathCost = 0;

    for (let step = 0; step < maxSteps && !samePosition(position, grid.target); step += 1) {
      const decision = this.chooseAction(grid, position, explorationRate);
      if (!decision) break;

      const visitKey = positionKey(decision.to);
      const repeatCount = seen.get(visitKey) ?? 0;
      seen.set(visitKey, repeatCount + 1);
      const stepReward = this.rewardFor(grid, position, decision.to, repeatCount);
      steps.push({ from: position, to: decision.to, action: decision.action, reward: stepReward });
      this.visits.set(visitKey, (this.visits.get(visitKey) ?? 0) + 1);
      this.rewardMemory.set(visitKey, (this.rewardMemory.get(visitKey) ?? 0) + stepReward);
      reward += stepReward;
      pathCost += decision.to.weight;
      position = decision.to;
      path.push(position);
    }

    return {
      steps,
      path,
      reward,
      pathCost,
      reached: samePosition(position, grid.target)
    };
  }

  private learnFromEpisode(
    grid: GridModel,
    steps: readonly EpisodeStep[],
    learningRate: number,
    discountFactor: number
  ): void {
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const step = steps[index];
      if (!step) continue;
      const nextBest = this.bestQ(grid, step.to);
      const key = actionKey(step.from, step.action);
      const oldValue = this.qValues.get(key) ?? 0;
      const updated = oldValue + learningRate * (step.reward + discountFactor * nextBest - oldValue);
      this.qValues.set(key, updated);
    }
  }

  private chooseAction(grid: GridModel, position: GridPosition, explorationRate: number) {
    const neighbors = getNeighbors(grid, position);
    if (neighbors.length === 0) return undefined;

    const candidates = neighbors
      .map((neighbor) => ({ to: neighbor, action: this.actionBetween(position, neighbor) }))
      .filter((candidate): candidate is { readonly to: GridCell; readonly action: NeuralAction } => candidate.action !== undefined);

    if (candidates.length === 0) return undefined;
    if (Math.random() < explorationRate) {
      const biased = [...candidates].sort((a, b) => this.obstacleRisk(a.to) - this.obstacleRisk(b.to));
      return biased[Math.floor(Math.random() * Math.min(3, biased.length))];
    }

    return [...candidates].sort((a, b) => this.actionValue(position, b.to, b.action) - this.actionValue(position, a.to, a.action))[0];
  }

  private rewardFor(grid: GridModel, from: GridPosition, to: GridCell, repeatCount: number): number {
    const distanceGain = manhattanDistance(from, grid.target) - manhattanDistance(to, grid.target);
    const targetReward = samePosition(to, grid.target) ? 180 : 0;
    const weightPenalty = to.kind === "weight" ? to.weight * 4 : to.weight;
    const repeatPenalty = repeatCount * 5;
    const obstacleRisk = this.obstacleRisk(to);
    if (to.kind === "wall") {
      this.obstacleMemory.set(positionKey(to), obstacleRisk + 1);
    }
    return targetReward + distanceGain * 3 - weightPenalty - repeatPenalty - obstacleRisk * 6;
  }

  private bestQ(grid: GridModel, position: GridPosition): number {
    const neighbors = getNeighbors(grid, position);
    if (neighbors.length === 0) return 0;
    return Math.max(
      ...neighbors.map((neighbor) => {
        const action = this.actionBetween(position, neighbor);
        return action ? this.actionValue(position, neighbor, action) : 0;
      })
    );
  }

  private actionValue(from: GridPosition, to: GridCell, action: NeuralAction): number {
    const learned = this.qValues.get(actionKey(from, action)) ?? 0;
    const reward = this.rewardMemory.get(positionKey(to)) ?? 0;
    return learned + reward * 0.02 - this.obstacleRisk(to) * 3;
  }

  private obstacleRisk(cell: GridPosition): number {
    return this.obstacleMemory.get(positionKey(cell)) ?? 0;
  }

  private actionBetween(from: GridPosition, to: GridPosition): NeuralAction | undefined {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return (Object.entries(actions).find(([, vector]) => vector.x === dx && vector.y === dy)?.[0] ?? undefined) as
      | NeuralAction
      | undefined;
  }

  private computeCellSignals(grid: GridModel): readonly NeuralCellSignal[] {
    const maxVisits = Math.max(1, ...this.visits.values());
    const maxReward = Math.max(1, ...[...this.rewardMemory.values()].map(Math.abs));
    return grid.cells
      .filter((cell) => cell.kind !== "wall")
      .map((cell) => {
        const key = positionKey(cell);
        const visits = this.visits.get(key) ?? 0;
        const reward = this.rewardMemory.get(key) ?? 0;
        const prediction = clamp01((this.bestQ(grid, cell) + 30) / 210);
        return {
          x: cell.x,
          y: cell.y,
          confidence: clamp01(visits / maxVisits),
          visits,
          reward: reward / maxReward,
          obstacleRisk: clamp01(this.obstacleRisk(cell) / 8),
          prediction
        };
      });
  }

  private estimateFuturePath(grid: GridModel): readonly GridPosition[] {
    const path: GridPosition[] = [grid.start];
    const visited = new Set<string>([positionKey(grid.start)]);
    let position = grid.start;
    for (let step = 0; step < grid.width * grid.height && !samePosition(position, grid.target); step += 1) {
      const next = this.chooseAction(grid, position, 0);
      if (!next || visited.has(positionKey(next.to))) break;
      path.push(next.to);
      visited.add(positionKey(next.to));
      position = next.to;
    }
    return path;
  }

  private pathToEvents(path: readonly GridPosition[]): readonly PathfinderEvent[] {
    return path.map((position, depth) => ({
      algorithm: "astar",
      type: "path",
      position,
      cost: depth,
      depth,
      timestamp: performance.now()
    }));
  }

  private computeConfidence(grid: GridModel): number {
    const bestPathSignal = this.bestPath.length > 0 ? 1 - this.bestPath.length / Math.max(grid.width + grid.height, 1) : 0;
    const targetSignal = this.bestQ(grid, grid.target) / 180;
    const coverage = this.visits.size / Math.max(grid.cells.filter((cell) => cell.kind !== "wall").length, 1);
    return clamp01(bestPathSignal * 0.45 + targetSignal * 0.35 + coverage * 0.2);
  }

  private computeConvergence(): number {
    const recent = this.epochs.slice(-12);
    if (recent.length < 4) return 0;
    const averageDelta = recent.reduce((sum, epoch) => sum + epoch.convergenceDelta, 0) / recent.length;
    return clamp01(1 - averageDelta * 20);
  }
}
