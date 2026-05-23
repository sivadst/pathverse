import type { NeuralMemorySnapshot } from "./neural-learning-engine";

interface SerializedNeuralMemory {
  readonly qValues: readonly [string, number][];
  readonly visits: readonly [string, number][];
  readonly obstacleMemory: readonly [string, number][];
  readonly rewardMemory: readonly [string, number][];
  readonly bestPath: NeuralMemorySnapshot["bestPath"];
  readonly failures: number;
  readonly version: number;
}

export class NeuralMemoryStore {
  constructor(private readonly storageKey = "pathverse.neural-memory.v1") {}

  save(memory: NeuralMemorySnapshot): void {
    if (typeof localStorage === "undefined") return;
    const serialized: SerializedNeuralMemory = {
      qValues: [...memory.qValues.entries()],
      visits: [...memory.visits.entries()],
      obstacleMemory: [...memory.obstacleMemory.entries()],
      rewardMemory: [...memory.rewardMemory.entries()],
      bestPath: memory.bestPath,
      failures: memory.failures,
      version: memory.version
    };
    localStorage.setItem(this.storageKey, JSON.stringify(serialized));
  }

  load(): NeuralMemorySnapshot | undefined {
    if (typeof localStorage === "undefined") return undefined;
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as SerializedNeuralMemory;
    return {
      qValues: new Map(parsed.qValues),
      visits: new Map(parsed.visits),
      obstacleMemory: new Map(parsed.obstacleMemory),
      rewardMemory: new Map(parsed.rewardMemory),
      bestPath: parsed.bestPath,
      failures: parsed.failures,
      version: parsed.version
    };
  }
}
