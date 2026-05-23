import { Container, Graphics } from "pixi.js";
import type { GridPosition } from "../core/types";
import type { CivilizationSnapshot } from "../civilization/civilization-engine";
import type { MegacitySnapshot } from "../civilization/megacity-simulation";
import type { MultiversePredictionSnapshot } from "../civilization/multiverse-prediction";
import type { WarfareSnapshot } from "../civilization/faction-warfare";

export interface CivilizationProjection {
  readonly x: number;
  readonly y: number;
  readonly cellSize: number;
}

export type CivilizationProjector = (position: GridPosition, lane: number) => CivilizationProjection;

const factionColors: Record<string, number> = {
  "faction-aurelia": 0x18f5d2,
  "faction-vantablade": 0xff4d6d,
  "faction-novaris": 0xffce3a
};

const districtColors = {
  civic: 0x18f5d2,
  industrial: 0xffce3a,
  research: 0xd45cff,
  logistics: 0x4e8cff,
  defense: 0xff4d6d
};

export class CivilizationVisualizationLayer {
  readonly container = new Container();
  private readonly influence = new Graphics();
  private readonly cities = new Graphics();
  private readonly drones = new Graphics();
  private readonly futures = new Graphics();
  private readonly warfare = new Graphics();
  private phase = 0;
  private civilization: CivilizationSnapshot | undefined;
  private megacity: MegacitySnapshot | undefined;
  private prediction: MultiversePredictionSnapshot | undefined;
  private war: WarfareSnapshot | undefined;
  private lane = 0;

  constructor(private readonly projector: CivilizationProjector) {
    this.container.label = "civilization-world-overlay";
    this.container.addChild(this.influence, this.cities, this.drones, this.futures, this.warfare);
  }

  setWorld(
    civilization: CivilizationSnapshot,
    megacity: MegacitySnapshot,
    prediction: MultiversePredictionSnapshot,
    war: WarfareSnapshot,
    lane = 0
  ): void {
    this.civilization = civilization;
    this.megacity = megacity;
    this.prediction = prediction;
    this.war = war;
    this.lane = lane;
    this.redrawStatic();
  }

  update(deltaMs: number): void {
    this.phase = (this.phase + deltaMs * 0.0015) % (Math.PI * 2);
    this.redrawDynamic();
  }

  clear(): void {
    this.civilization = undefined;
    this.megacity = undefined;
    this.prediction = undefined;
    this.war = undefined;
    this.influence.clear();
    this.cities.clear();
    this.drones.clear();
    this.futures.clear();
    this.warfare.clear();
  }

  private redrawStatic(): void {
    this.influence.clear();
    this.cities.clear();
    if (!this.civilization || !this.megacity) return;

    for (const cell of this.civilization.influence) {
      if (!cell.controllerFactionId || cell.stability < 0.08) continue;
      const projected = this.projector(cell, this.lane);
      this.influence.rect(
        projected.x - projected.cellSize / 2,
        projected.y - projected.cellSize / 2,
        projected.cellSize,
        projected.cellSize
      );
      this.influence.fill({
        color: factionColors[cell.controllerFactionId] ?? 0x8aa0b8,
        alpha: Math.max(0.035, cell.stability * 0.18)
      });
    }

    for (const resource of this.civilization.resources) {
      const projected = this.projector(resource, this.lane);
      const color = resource.controllerFactionId ? factionColors[resource.controllerFactionId] ?? 0xffffff : 0xffffff;
      this.cities.circle(projected.x, projected.y, projected.cellSize * 0.55);
      this.cities.stroke({ color, alpha: 0.78, width: 2 });
      this.cities.circle(projected.x, projected.y, projected.cellSize * 0.18);
      this.cities.fill({ color: 0xffffff, alpha: 0.72 });
    }

    for (const district of this.megacity.districts) {
      const projected = this.projector(district, this.lane);
      const color = districtColors[district.kind];
      const size = projected.cellSize * (0.45 + district.density * 0.48);
      this.cities.rect(projected.x - size / 2, projected.y - size / 2, size, size);
      this.cities.fill({ color, alpha: 0.42 });
      this.cities.stroke({ color, alpha: 0.72, width: 1 });
    }
  }

  private redrawDynamic(): void {
    this.drones.clear();
    this.futures.clear();
    this.warfare.clear();
    if (!this.megacity || !this.prediction || !this.war) return;

    for (const route of this.megacity.droneRoutes) {
      const from = this.projector(route.from, this.lane);
      const to = this.projector(route.to, this.lane);
      const x = from.x + (to.x - from.x) * route.progress;
      const y = from.y + (to.y - from.y) * route.progress;
      this.drones.moveTo(from.x, from.y);
      this.drones.lineTo(to.x, to.y);
      this.drones.stroke({ color: 0x4e8cff, alpha: 0.13 + route.load * 0.2, width: 1 });
      this.drones.circle(x, y, Math.max(1.5, from.cellSize * 0.22));
      this.drones.fill({ color: 0x4e8cff, alpha: 0.8 });
    }

    for (const pulse of this.megacity.energyPulses) {
      const projected = this.projector(pulse, this.lane);
      const pulseScale = 0.7 + (Math.sin(this.phase + pulse.radius) + 1) * 0.5;
      this.drones.circle(projected.x, projected.y, projected.cellSize * pulse.radius * 0.35 * pulseScale);
      this.drones.stroke({ color: 0x18f5d2, alpha: pulse.intensity * 0.18, width: 1 });
    }

    const origin = this.projector({ x: 3, y: 3 }, this.lane);
    this.prediction.branches.forEach((branch, index) => {
      const radius = origin.cellSize * (3 + index * 1.4 + branch.probability * 8);
      this.futures.circle(origin.x, origin.y, radius);
      this.futures.stroke({
        color: branch.id === this.prediction?.mostLikelyBranchId ? 0xffce3a : 0xd45cff,
        alpha: 0.08 + branch.probability * 0.28,
        width: 1 + branch.probability * 2
      });
    });

    if (this.war.strategicTension > 0.25) {
      const alpha = this.war.strategicTension * 0.2;
      for (const relation of this.war.diplomacy.filter((entry) => entry.posture === "war" || entry.posture === "rival")) {
        const fromFaction = this.civilization?.populations.find((population) => population.factionId === relation.fromFactionId);
        const toFaction = this.civilization?.populations.find((population) => population.factionId === relation.toFactionId);
        if (!fromFaction || !toFaction) continue;
        const from = this.projector(fromFaction.capital, this.lane);
        const to = this.projector(toFaction.capital, this.lane);
        this.warfare.moveTo(from.x, from.y);
        this.warfare.lineTo(to.x, to.y);
        this.warfare.stroke({ color: 0xff4d6d, alpha, width: 1.5 });
      }
    }
  }
}
