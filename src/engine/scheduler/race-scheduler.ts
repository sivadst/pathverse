import type { AlgorithmId, PathfinderEvent } from "../core/types";
import { TelemetryEngine } from "../telemetry/telemetry-engine";
import type { SchedulerState } from "./animation-scheduler";

export interface RaceEventBatch {
  readonly algorithm: AlgorithmId;
  readonly lane: number;
  readonly events: readonly PathfinderEvent[];
}

export type RaceEventConsumer = (batches: readonly RaceEventBatch[], state: SchedulerState) => void;

export class RaceScheduler {
  private frameHandle: number | undefined;
  private lastFrame = 0;
  private running = false;
  private speed = 1;
  private readonly cursors = new Map<AlgorithmId, number>();
  private tracks: readonly RaceEventBatch[] = [];

  constructor(
    private readonly telemetry: TelemetryEngine,
    private readonly onEvents: RaceEventConsumer
  ) {}

  load(tracks: readonly RaceEventBatch[], speed = 1): void {
    this.stop();
    this.tracks = tracks;
    this.speed = speed;
    this.cursors.clear();
    for (const track of tracks) {
      this.cursors.set(track.algorithm, 0);
    }
  }

  start(): void {
    if (this.running || typeof requestAnimationFrame === "undefined") return;
    this.running = true;
    this.lastFrame = performance.now();
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.frameHandle !== undefined && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = undefined;
    }
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.running) return;
    const deltaMs = timestamp - this.lastFrame;
    const renderStart = performance.now();
    const budget = Math.max(1, Math.floor((deltaMs / 16.67) * 18 * this.speed));
    const batches = this.tracks.map((track) => {
      const cursor = this.cursors.get(track.algorithm) ?? 0;
      const nextCursor = Math.min(cursor + budget, track.events.length);
      this.cursors.set(track.algorithm, nextCursor);
      return { ...track, events: track.events.slice(cursor, nextCursor) };
    });
    const cursor = Math.max(...[...this.cursors.values(), 0]);
    const total = Math.max(...this.tracks.map((track) => track.events.length), 0);
    this.onEvents(batches, { running: this.running, cursor, total, speed: this.speed });
    this.telemetry.recordFrame(deltaMs, performance.now() - renderStart);
    this.lastFrame = timestamp;

    if (cursor >= total) {
      this.stop();
      return;
    }
    this.frameHandle = requestAnimationFrame(this.tick);
  };
}
