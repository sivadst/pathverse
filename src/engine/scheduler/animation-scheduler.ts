import type { PathfinderEvent } from "../core/types";
import { TelemetryEngine } from "../telemetry/telemetry-engine";

export interface SchedulerState {
  readonly running: boolean;
  readonly cursor: number;
  readonly total: number;
  readonly speed: number;
}

export type EventConsumer = (events: readonly PathfinderEvent[], state: SchedulerState) => void;

export class AnimationScheduler {
  private frameHandle: number | undefined;
  private lastFrame = 0;
  private cursor = 0;
  private running = false;
  private speed = 1;
  private events: readonly PathfinderEvent[] = [];

  constructor(
    private readonly telemetry: TelemetryEngine,
    private readonly onEvents: EventConsumer
  ) {}

  load(events: readonly PathfinderEvent[], speed = 1): void {
    this.stop();
    this.events = events;
    this.speed = speed;
    this.cursor = 0;
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

  scrub(cursor: number): void {
    this.cursor = Math.max(0, Math.min(cursor, this.events.length));
    this.emit([]);
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.running) return;
    const deltaMs = timestamp - this.lastFrame;
    const renderStart = performance.now();
    const budget = Math.max(1, Math.floor((deltaMs / 16.67) * 24 * this.speed));
    const nextCursor = Math.min(this.cursor + budget, this.events.length);
    const batch = this.events.slice(this.cursor, nextCursor);
    this.cursor = nextCursor;
    this.emit(batch);
    this.telemetry.recordFrame(deltaMs, performance.now() - renderStart);
    this.lastFrame = timestamp;

    if (this.cursor >= this.events.length) {
      this.stop();
      return;
    }
    this.frameHandle = requestAnimationFrame(this.tick);
  };

  private emit(batch: readonly PathfinderEvent[]): void {
    this.onEvents(batch, {
      running: this.running,
      cursor: this.cursor,
      total: this.events.length,
      speed: this.speed
    });
  }
}
