import { Container, Graphics } from "pixi.js";
import type { PathfinderEvent } from "../core/types";
import type { ParticleProjector } from "./gpu-particle-engine";
import type { RenderQualityProfile } from "./render-quality";

interface TrailPoint {
  readonly x: number;
  readonly y: number;
  life: number;
}

export class NeonTrailSystem {
  readonly container = new Container();
  private readonly trails = new Map<string, TrailPoint[]>();
  private readonly graphics = new Graphics();
  private quality: RenderQualityProfile;

  constructor(quality: RenderQualityProfile) {
    this.quality = quality;
    this.container.label = "neon-trails";
    this.container.addChild(this.graphics);
  }

  setQuality(quality: RenderQualityProfile): void {
    this.quality = quality;
  }

  ingest(events: readonly PathfinderEvent[], projector: ParticleProjector, lane = 0): void {
    for (const event of events) {
      if (event.type !== "visited" && event.type !== "path") continue;
      const key = `${lane}:${event.algorithm}`;
      const projected = projector(event.position, lane);
      const trail = this.trails.get(key) ?? [];
      trail.push({ x: projected.x, y: projected.y, life: event.type === "path" ? 1.35 : 0.82 });
      if (trail.length > this.quality.trailSegments) {
        trail.splice(0, trail.length - this.quality.trailSegments);
      }
      this.trails.set(key, trail);
    }
  }

  update(deltaMs: number): void {
    const decay = Math.min(0.08, deltaMs / 1000);
    this.graphics.clear();

    for (const [key, points] of this.trails.entries()) {
      const lane = Number(key.split(":")[0] ?? 0);
      const color = lane % 2 === 0 ? 0x18f5d2 : 0xffce3a;
      for (const point of points) {
        point.life -= decay;
      }
      const alive = points.filter((point) => point.life > 0);
      this.trails.set(key, alive);
      if (alive.length < 2) continue;

      for (let index = 1; index < alive.length; index += 1) {
        const previous = alive[index - 1];
        const current = alive[index];
        if (!previous || !current) continue;
        const alpha = Math.max(0.04, current.life * 0.55);
        this.graphics.moveTo(previous.x, previous.y);
        this.graphics.lineTo(current.x, current.y);
        this.graphics.stroke({ width: 2.5, color, alpha });
      }
    }
  }

  clear(): void {
    this.trails.clear();
    this.graphics.clear();
  }
}
