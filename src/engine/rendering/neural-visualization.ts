import { Container, Graphics } from "pixi.js";
import type { GridPosition } from "../core/types";
import type { NeuralLearningSnapshot } from "../ai/neural-learning-engine";
import type { SwarmSnapshot } from "../ai/swarm-intelligence";

export interface NeuralProjection {
  readonly x: number;
  readonly y: number;
  readonly cellSize: number;
}

export type NeuralProjector = (position: GridPosition, lane: number) => NeuralProjection;

export class NeuralVisualizationLayer {
  readonly container = new Container();
  private readonly heatmap = new Graphics();
  private readonly prediction = new Graphics();
  private readonly waves = new Graphics();
  private readonly swarm = new Graphics();
  private phase = 0;
  private neural: NeuralLearningSnapshot | undefined;
  private swarmSnapshot: SwarmSnapshot | undefined;
  private lane = 0;

  constructor(private readonly projector: NeuralProjector) {
    this.container.label = "neural-cognition-overlay";
    this.container.addChild(this.heatmap, this.prediction, this.waves, this.swarm);
  }

  setNeuralSnapshot(snapshot: NeuralLearningSnapshot, lane = 0): void {
    this.neural = snapshot;
    this.lane = lane;
    this.redrawStatic();
  }

  setSwarmSnapshot(snapshot: SwarmSnapshot): void {
    this.swarmSnapshot = snapshot;
    this.redrawSwarm();
  }

  update(deltaMs: number): void {
    this.phase = (this.phase + deltaMs * 0.002) % (Math.PI * 2);
    this.redrawWaves();
    this.redrawSwarm();
  }

  clear(): void {
    this.neural = undefined;
    this.swarmSnapshot = undefined;
    this.heatmap.clear();
    this.prediction.clear();
    this.waves.clear();
    this.swarm.clear();
  }

  private redrawStatic(): void {
    this.heatmap.clear();
    this.prediction.clear();
    if (!this.neural) return;

    for (const signal of this.neural.cellSignals) {
      if (signal.confidence <= 0.02 && signal.prediction <= 0.08) continue;
      const projected = this.projector(signal, this.lane);
      const heatAlpha = Math.min(0.46, signal.confidence * 0.34 + Math.max(0, signal.reward) * 0.12);
      this.heatmap.rect(
        projected.x - projected.cellSize / 2,
        projected.y - projected.cellSize / 2,
        projected.cellSize,
        projected.cellSize
      );
      this.heatmap.fill({ color: signal.reward >= 0 ? 0x18f5d2 : 0xff4d6d, alpha: heatAlpha });

      if (signal.prediction > 0.2) {
        const radius = Math.max(1.5, projected.cellSize * signal.prediction * 0.42);
        this.prediction.circle(projected.x, projected.y, radius);
        this.prediction.fill({ color: 0xffce3a, alpha: signal.prediction * 0.34 });
      }
    }

    for (let index = 1; index < this.neural.bestPath.length; index += 1) {
      const previous = this.projector(this.neural.bestPath[index - 1]!, this.lane);
      const current = this.projector(this.neural.bestPath[index]!, this.lane);
      this.prediction.moveTo(previous.x, previous.y);
      this.prediction.lineTo(current.x, current.y);
      this.prediction.stroke({ color: 0xffce3a, alpha: 0.58, width: 2 });
    }
  }

  private redrawWaves(): void {
    this.waves.clear();
    if (!this.neural) return;
    const path = this.neural.bestPath;
    if (path.length === 0) return;
    const stride = Math.max(1, Math.floor(path.length / 12));
    for (let index = 0; index < path.length; index += stride) {
      const projected = this.projector(path[index]!, this.lane);
      const pulse = (Math.sin(this.phase + index * 0.45) + 1) / 2;
      this.waves.circle(projected.x, projected.y, projected.cellSize * (0.4 + pulse * 1.2));
      this.waves.stroke({ color: 0x18f5d2, alpha: 0.08 + pulse * 0.2, width: 1 });
    }
  }

  private redrawSwarm(): void {
    this.swarm.clear();
    if (!this.swarmSnapshot) return;

    for (const signal of this.swarmSnapshot.signals) {
      const from = this.swarmSnapshot.agents.find((agent) => agent.id === signal.from);
      const to = this.swarmSnapshot.agents.find((agent) => agent.id === signal.to);
      if (!from || !to) continue;
      const fromPoint = this.projector(from.position, this.lane);
      const toPoint = this.projector(to.position, this.lane);
      this.swarm.moveTo(fromPoint.x, fromPoint.y);
      this.swarm.lineTo(toPoint.x, toPoint.y);
      this.swarm.stroke({ color: 0xd45cff, alpha: 0.08 + signal.strength * 0.22, width: 1 });
    }

    for (const agent of this.swarmSnapshot.agents) {
      const projected = this.projector(agent.position, this.lane);
      this.swarm.circle(projected.x, projected.y, Math.max(2, projected.cellSize * 0.34));
      this.swarm.fill({ color: 0xd45cff, alpha: 0.42 + agent.confidence * 0.42 });
    }
  }
}
