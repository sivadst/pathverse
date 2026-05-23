import { Container, Particle, ParticleContainer, Texture } from "pixi.js";
import type { GridPosition, PathfinderEvent } from "../core/types";
import type { RenderQualityProfile } from "./render-quality";

export interface ParticleSpawnPoint {
  readonly x: number;
  readonly y: number;
  readonly color: number;
  readonly intensity: number;
}

interface ParticleState {
  readonly particle: Particle;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  baseScale: number;
}

export type ParticleProjector = (position: GridPosition, lane: number) => { readonly x: number; readonly y: number };

export class GpuParticleEngine {
  readonly container: ParticleContainer<Particle>;
  private readonly states: ParticleState[] = [];
  private quality: RenderQualityProfile;

  constructor(quality: RenderQualityProfile) {
    this.quality = quality;
    this.container = new ParticleContainer({
      dynamicProperties: {
        position: true,
        rotation: true,
        color: true,
        vertex: false,
        uvs: false
      },
      texture: Texture.WHITE
    });
    this.container.label = "gpu-particles";
  }

  attach(parent: Container): void {
    if (!this.container.parent) {
      parent.addChild(this.container);
    }
  }

  setQuality(quality: RenderQualityProfile): void {
    this.quality = quality;
    while (this.states.length > quality.maxParticles) {
      const expired = this.states.shift();
      if (expired) {
        this.container.removeParticle(expired.particle);
      }
    }
  }

  burstFromEvents(events: readonly PathfinderEvent[], projector: ParticleProjector, lane = 0): void {
    const limited = events.slice(0, this.quality.eventBatchLimit);
    for (const event of limited) {
      if (event.type === "rejected") continue;
      const projected = projector(event.position, lane);
      const color = event.type === "path" ? 0xff4d6d : event.type === "queued" ? 0x18f5d2 : 0x4e8cff;
      this.spawn({ x: projected.x, y: projected.y, color, intensity: event.type === "path" ? 1 : 0.45 });
    }
  }

  update(deltaMs: number): void {
    const delta = Math.min(32, deltaMs) / 16.67;
    for (let index = this.states.length - 1; index >= 0; index -= 1) {
      const state = this.states[index];
      if (!state) continue;
      state.life -= delta;
      state.particle.x += state.velocityX * delta;
      state.particle.y += state.velocityY * delta;
      state.particle.rotation += 0.04 * delta;
      const lifeRatio = Math.max(0, state.life / state.maxLife);
      state.particle.alpha = lifeRatio * 0.72;
      state.particle.scaleX = state.baseScale * lifeRatio;
      state.particle.scaleY = state.baseScale * lifeRatio;

      if (state.life <= 0) {
        this.container.removeParticle(state.particle);
        this.states.splice(index, 1);
      }
    }
  }

  clear(): void {
    this.container.removeParticles(0, this.container.particleChildren.length);
    this.states.length = 0;
  }

  get activeCount(): number {
    return this.states.length;
  }

  private spawn(point: ParticleSpawnPoint): void {
    if (this.states.length >= this.quality.maxParticles) {
      const expired = this.states.shift();
      if (expired) {
        this.container.removeParticle(expired.particle);
      }
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = 0.35 + Math.random() * 1.6 * point.intensity;
    const baseScale = 2 + Math.random() * 4 * point.intensity;
    const particle = new Particle({
      texture: Texture.WHITE,
      x: point.x,
      y: point.y,
      scaleX: baseScale,
      scaleY: baseScale,
      anchorX: 0.5,
      anchorY: 0.5,
      tint: point.color,
      alpha: 0.72
    });

    this.container.addParticle(particle);
    this.states.push({
      particle,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      life: 24 + Math.random() * 34,
      maxLife: 58,
      baseScale
    });
  }
}
