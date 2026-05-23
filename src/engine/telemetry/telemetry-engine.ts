import type { AlgorithmId, PathfinderMetrics } from "../core/types";
import type { NeuralLearningSnapshot } from "../ai/neural-learning-engine";
import type { SwarmSnapshot } from "../ai/swarm-intelligence";

export interface FrameSample {
  readonly frame: number;
  readonly fps: number;
  readonly deltaMs: number;
  readonly renderMs: number;
  readonly heapMb: number;
  readonly timestamp: number;
}

export interface AlgorithmTelemetry {
  readonly algorithm: AlgorithmId;
  readonly efficiencyScore: number;
  readonly metrics: PathfinderMetrics;
}

export interface TelemetrySnapshot {
  readonly frames: readonly FrameSample[];
  readonly algorithms: readonly AlgorithmTelemetry[];
  readonly averageFps: number;
  readonly p95FrameMs: number;
  readonly averageRenderMs: number;
  readonly droppedFrameRatio: number;
  readonly peakHeapMb: number;
  readonly neural?: NeuralTelemetry;
  readonly swarm?: SwarmTelemetry;
}

export interface NeuralTelemetry {
  readonly confidence: number;
  readonly convergence: number;
  readonly memoryEntries: number;
  readonly rewardTrend: number;
  readonly failureCount: number;
  readonly predictionCells: number;
  readonly bestPathLength: number;
}

export interface SwarmTelemetry {
  readonly agentCount: number;
  readonly signalCount: number;
  readonly formationScore: number;
  readonly collisionRisk: number;
}

export class TelemetryEngine {
  private readonly maxFrames: number;
  private readonly frames: FrameSample[] = [];
  private readonly algorithms = new Map<AlgorithmId, AlgorithmTelemetry>();
  private neural: NeuralTelemetry | undefined;
  private swarm: SwarmTelemetry | undefined;
  private frameCounter = 0;

  constructor(maxFrames = 240) {
    this.maxFrames = maxFrames;
  }

  recordFrame(deltaMs: number, renderMs: number): FrameSample {
    this.frameCounter += 1;
    const heapMb = this.readHeapMb();
    const sample: FrameSample = {
      frame: this.frameCounter,
      fps: deltaMs > 0 ? 1000 / deltaMs : 0,
      deltaMs,
      renderMs,
      heapMb,
      timestamp: performance.now()
    };

    this.frames.push(sample);
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
    return sample;
  }

  recordAlgorithm(metrics: PathfinderMetrics): AlgorithmTelemetry {
    const normalizedDuration = Math.max(metrics.durationMs, 0.1);
    const normalizedExploration = Math.max(metrics.visitedNodes, 1);
    const pathQuality = metrics.pathLength > 0 && Number.isFinite(metrics.pathCost) ? 1000 / metrics.pathCost : 0;
    const efficiencyScore = Math.round(pathQuality + 5000 / normalizedDuration + 2000 / normalizedExploration);
    const telemetry = { algorithm: metrics.algorithm, metrics, efficiencyScore };
    this.algorithms.set(metrics.algorithm, telemetry);
    return telemetry;
  }

  recordNeural(snapshot: NeuralLearningSnapshot): NeuralTelemetry {
    const recent = snapshot.epochs.slice(-8);
    const rewardTrend =
      recent.length > 1 ? (recent.at(-1)?.reward ?? 0) - (recent[0]?.reward ?? 0) : recent[0]?.reward ?? 0;
    const memoryEntries =
      snapshot.memory.qValues.size +
      snapshot.memory.visits.size +
      snapshot.memory.rewardMemory.size +
      snapshot.memory.obstacleMemory.size;
    this.neural = {
      confidence: snapshot.confidence,
      convergence: snapshot.convergence,
      memoryEntries,
      rewardTrend,
      failureCount: snapshot.memory.failures,
      predictionCells: snapshot.predictionField.length,
      bestPathLength: snapshot.bestPath.length
    };
    return this.neural;
  }

  recordSwarm(snapshot: SwarmSnapshot): SwarmTelemetry {
    this.swarm = {
      agentCount: snapshot.agents.length,
      signalCount: snapshot.signals.length,
      formationScore: snapshot.formationScore,
      collisionRisk: snapshot.collisionRisk
    };
    return this.swarm;
  }

  snapshot(): TelemetrySnapshot {
    const averageFps =
      this.frames.length > 0 ? this.frames.reduce((sum, frame) => sum + frame.fps, 0) / this.frames.length : 0;
    const averageRenderMs =
      this.frames.length > 0 ? this.frames.reduce((sum, frame) => sum + frame.renderMs, 0) / this.frames.length : 0;
    const sortedFrameTimes = [...this.frames].map((frame) => frame.deltaMs).sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.ceil(sortedFrameTimes.length * 0.95) - 1);
    const p95FrameMs = sortedFrameTimes[p95Index] ?? 0;
    const droppedFrameRatio =
      this.frames.length > 0 ? this.frames.filter((frame) => frame.deltaMs > 22).length / this.frames.length : 0;
    const peakHeapMb = this.frames.reduce((max, frame) => Math.max(max, frame.heapMb), 0);
    const snapshot = {
      frames: [...this.frames],
      algorithms: [...this.algorithms.values()].sort((a, b) => b.efficiencyScore - a.efficiencyScore),
      averageFps,
      p95FrameMs,
      averageRenderMs,
      droppedFrameRatio,
      peakHeapMb
    };
    return {
      ...snapshot,
      ...(this.neural ? { neural: this.neural } : {}),
      ...(this.swarm ? { swarm: this.swarm } : {})
    };
  }

  reset(): void {
    this.frames.length = 0;
    this.algorithms.clear();
    this.neural = undefined;
    this.swarm = undefined;
    this.frameCounter = 0;
  }

  private readHeapMb(): number {
    const candidate = performance as Performance & { memory?: { usedJSHeapSize: number } };
    return candidate.memory ? candidate.memory.usedJSHeapSize / 1024 / 1024 : 0;
  }
}
