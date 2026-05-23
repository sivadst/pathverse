import type { AlgorithmId, PathfinderMetrics } from "../core/types";

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
}

export class TelemetryEngine {
  private readonly maxFrames: number;
  private readonly frames: FrameSample[] = [];
  private readonly algorithms = new Map<AlgorithmId, AlgorithmTelemetry>();
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
    return {
      frames: [...this.frames],
      algorithms: [...this.algorithms.values()].sort((a, b) => b.efficiencyScore - a.efficiencyScore),
      averageFps,
      p95FrameMs,
      averageRenderMs,
      droppedFrameRatio,
      peakHeapMb
    };
  }

  reset(): void {
    this.frames.length = 0;
    this.algorithms.clear();
    this.frameCounter = 0;
  }

  private readHeapMb(): number {
    const candidate = performance as Performance & { memory?: { usedJSHeapSize: number } };
    return candidate.memory ? candidate.memory.usedJSHeapSize / 1024 / 1024 : 0;
  }
}
