import { Container, Graphics } from "pixi.js";
import type { GridPosition } from "../core/types";
import type { ThoughtStreamSnapshot, ThoughtPulse, UncertaintyWave, ThoughtPropagation } from "../ai/thought-stream-engine";
import type { RenderQualityProfile } from "./render-quality";

export interface ThoughtProjection {
  readonly x: number;
  readonly y: number;
  readonly cellSize: number;
}

export type ThoughtProjector = (position: GridPosition, lane: number) => ThoughtProjection;

const categoryColors: Record<ThoughtPulse["category"], number> = {
  reasoning: 0x00e5ff,
  uncertainty: 0xffab40,
  prediction: 0xffd740,
  strategic: 0xe040fb
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export class ThoughtStreamVisualizationLayer {
  readonly container = new Container();

  private readonly pulseGraphics = new Graphics();
  private readonly waveGraphics = new Graphics();
  private readonly cognitionGraphics = new Graphics();
  private readonly propagationGraphics = new Graphics();

  private snapshot: ThoughtStreamSnapshot | undefined;
  private projector: ThoughtProjector | undefined;
  private lane = 0;
  private phase = 0;
  private quality: RenderQualityProfile | undefined;

  constructor() {
    this.container.label = "thought-stream-overlay";
    this.container.addChild(this.cognitionGraphics);
    this.container.addChild(this.waveGraphics);
    this.container.addChild(this.pulseGraphics);
    this.container.addChild(this.propagationGraphics);
  }

  setProjector(projector: ThoughtProjector, lane = 0): void {
    this.projector = projector;
    this.lane = lane;
  }

  setQuality(quality: RenderQualityProfile): void {
    this.quality = quality;
  }

  setSnapshot(snapshot: ThoughtStreamSnapshot): void {
    this.snapshot = snapshot;
  }

  update(deltaMs: number): void {
    if (!this.snapshot || !this.projector) return;

    this.phase += deltaMs * 0.003;

    this.redrawPulses(this.snapshot.pulses);
    this.redrawWaves(this.snapshot.waves);
    this.redrawCognitionField();
    this.redrawPropagations(this.snapshot.propagations);
  }

  clear(): void {
    this.snapshot = undefined;
    this.pulseGraphics.clear();
    this.waveGraphics.clear();
    this.cognitionGraphics.clear();
    this.propagationGraphics.clear();
  }

  private redrawPulses(pulses: readonly ThoughtPulse[]): void {
    this.pulseGraphics.clear();
    if (!this.projector) return;

    const maxPulses = this.quality?.mode === "performance" ? 20 : this.quality?.mode === "balanced" ? 32 : 48;
    const limited = pulses.slice(0, maxPulses);

    for (const pulse of limited) {
      const proj = this.projector(pulse.position, this.lane);
      const color = categoryColors[pulse.category];
      const pulseFactor = Math.sin(pulse.phase) * 0.5 + 0.5;
      const radius = proj.cellSize * (0.3 + pulseFactor * 0.25) * pulse.intensity;
      const alpha = clamp01(0.15 + pulse.intensity * 0.45 * pulseFactor);

      this.pulseGraphics.circle(proj.x + proj.cellSize * 0.5, proj.y + proj.cellSize * 0.5, radius);
      this.pulseGraphics.fill({ color, alpha });

      // Outer ring
      if (pulse.intensity > 0.4) {
        const outerRadius = radius * 1.6;
        this.pulseGraphics.circle(proj.x + proj.cellSize * 0.5, proj.y + proj.cellSize * 0.5, outerRadius);
        this.pulseGraphics.fill({ color, alpha: alpha * 0.25 });
      }
    }
  }

  private redrawWaves(waves: readonly UncertaintyWave[]): void {
    this.waveGraphics.clear();
    if (!this.projector) return;

    const maxWaves = this.quality?.mode === "performance" ? 4 : this.quality?.mode === "balanced" ? 8 : 12;
    const limited = waves.slice(0, maxWaves);

    for (const wave of limited) {
      const proj = this.projector(wave.origin, this.lane);
      const cx = proj.x + proj.cellSize * 0.5;
      const cy = proj.y + proj.cellSize * 0.5;
      const waveAlpha = clamp01(wave.intensity * 0.4 * (Math.cos(wave.phase * 2) * 0.3 + 0.7));
      const pixelRadius = wave.radius * proj.cellSize;

      // Expanding ring
      this.waveGraphics.circle(cx, cy, pixelRadius);
      this.waveGraphics.stroke({ color: 0xffab40, width: 1.5, alpha: waveAlpha });

      // Inner ripple
      if (wave.radius > 1.5) {
        this.waveGraphics.circle(cx, cy, pixelRadius * 0.6);
        this.waveGraphics.stroke({ color: 0xffab40, width: 1, alpha: waveAlpha * 0.4 });
      }
    }
  }

  private redrawCognitionField(): void {
    this.cognitionGraphics.clear();
    if (!this.snapshot || !this.projector) return;

    const field = this.snapshot.cognitionField;
    const proj = this.projector(field.focusCenter, this.lane);
    const cx = proj.x + proj.cellSize * 0.5;
    const cy = proj.y + proj.cellSize * 0.5;
    const pixelRadius = field.focusRadius * proj.cellSize;

    if (pixelRadius > 2) {
      const modeColor = field.dominantMode === "exploitation" ? 0x00e5ff
        : field.dominantMode === "exploration" ? 0xe040fb
        : 0x76ff03;

      // Focus field glow
      const pulseAlpha = 0.06 + Math.sin(this.phase * 1.5) * 0.03;
      this.cognitionGraphics.circle(cx, cy, pixelRadius);
      this.cognitionGraphics.fill({ color: modeColor, alpha: pulseAlpha });

      // Focus ring
      this.cognitionGraphics.circle(cx, cy, pixelRadius);
      this.cognitionGraphics.stroke({ color: modeColor, width: 1.5, alpha: 0.2 + Math.sin(this.phase * 2) * 0.1 });
    }
  }

  private redrawPropagations(propagations: readonly ThoughtPropagation[]): void {
    this.propagationGraphics.clear();
    if (!this.projector) return;

    const maxPropagations = this.quality?.mode === "performance" ? 8 : this.quality?.mode === "balanced" ? 16 : 24;
    const limited = propagations.slice(0, maxPropagations);

    for (const prop of limited) {
      const fromProj = this.projector(prop.from, this.lane);
      const toProj = this.projector(prop.to, this.lane);
      const fx = fromProj.x + fromProj.cellSize * 0.5;
      const fy = fromProj.y + fromProj.cellSize * 0.5;
      const tx = toProj.x + toProj.cellSize * 0.5;
      const ty = toProj.y + toProj.cellSize * 0.5;

      // Connection line
      const lineAlpha = clamp01(prop.strength * 0.3);
      this.propagationGraphics.moveTo(fx, fy);
      this.propagationGraphics.lineTo(tx, ty);
      this.propagationGraphics.stroke({ color: 0x00e5ff, width: 1, alpha: lineAlpha });

      // Traveling dot
      const dotX = fx + (tx - fx) * prop.progress;
      const dotY = fy + (ty - fy) * prop.progress;
      const dotRadius = 2 + prop.strength * 2;
      this.propagationGraphics.circle(dotX, dotY, dotRadius);
      this.propagationGraphics.fill({ color: 0x00e5ff, alpha: clamp01(prop.strength * 0.7) });
    }
  }
}
