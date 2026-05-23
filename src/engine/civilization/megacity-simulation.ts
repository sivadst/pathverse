import { manhattanDistance, positionKey } from "../core/grid";
import type { GridModel, GridPosition } from "../core/types";
import type { CivilizationSnapshot } from "./civilization-engine";

export type DistrictKind = "civic" | "industrial" | "research" | "logistics" | "defense";

export interface MegacityDistrict extends GridPosition {
  readonly id: string;
  readonly kind: DistrictKind;
  readonly density: number;
  readonly energyDemand: number;
  readonly controllerFactionId?: string;
}

export interface DroneRoute {
  readonly id: string;
  readonly from: GridPosition;
  readonly to: GridPosition;
  readonly progress: number;
  readonly load: number;
}

export interface TrafficFlow {
  readonly id: string;
  readonly from: GridPosition;
  readonly to: GridPosition;
  readonly congestion: number;
  readonly throughput: number;
}

export interface EnergyPulse extends GridPosition {
  readonly id: string;
  readonly radius: number;
  readonly intensity: number;
}

export interface MegacitySnapshot {
  readonly tick: number;
  readonly districts: readonly MegacityDistrict[];
  readonly droneRoutes: readonly DroneRoute[];
  readonly traffic: readonly TrafficFlow[];
  readonly energyPulses: readonly EnergyPulse[];
  readonly logisticsEfficiency: number;
  readonly energyBalance: number;
}

const districtKinds: readonly DistrictKind[] = ["civic", "industrial", "research", "logistics", "defense"];

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export class MegacitySimulation {
  private tick = 0;
  private readonly districts: readonly MegacityDistrict[];
  private droneRoutes: readonly DroneRoute[];
  private traffic: readonly TrafficFlow[];
  private energyPulses: readonly EnergyPulse[] = [];

  constructor(grid: GridModel) {
    this.districts = this.createDistricts(grid);
    this.droneRoutes = this.createDroneRoutes();
    this.traffic = this.createTraffic();
  }

  step(civilization: CivilizationSnapshot): MegacitySnapshot {
    this.tick += 1;
    const factionByDistrict = new Map(
      this.districts.map((district) => {
        const influence = civilization.influence.find((cell) => cell.x === district.x && cell.y === district.y);
        return [district.id, influence?.controllerFactionId] as const;
      })
    );

    this.droneRoutes = this.droneRoutes.map((route) => ({
      ...route,
      progress: (route.progress + 0.035 + civilization.collaborationIndex * 0.025) % 1,
      load: clamp01(route.load + civilization.resourcePressure * 0.03 - civilization.conflictIndex * 0.02)
    }));

    this.traffic = this.traffic.map((flow) => {
      const pressure = civilization.influence.find((cell) => cell.x === flow.to.x && cell.y === flow.to.y)?.pressure ?? 0;
      const congestion = clamp01(flow.congestion + pressure * 0.04 - civilization.collaborationIndex * 0.025);
      return {
        ...flow,
        congestion,
        throughput: clamp01(flow.throughput + civilization.collaborationIndex * 0.02 - congestion * 0.018)
      };
    });

    this.energyPulses = this.districts
      .filter((district, index) => (index + this.tick) % 4 === 0)
      .map((district, index) => ({
        id: `pulse-${this.tick}-${district.id}`,
        x: district.x,
        y: district.y,
        radius: 3 + ((this.tick + index) % 6),
        intensity: clamp01(1 - district.energyDemand * civilization.resourcePressure * 0.001)
      }));

    const controlledDistricts = this.districts.map((district) => {
      const controllerFactionId = factionByDistrict.get(district.id);
      return controllerFactionId ? { ...district, controllerFactionId } : district;
    });

    return {
      tick: this.tick,
      districts: controlledDistricts,
      droneRoutes: this.droneRoutes,
      traffic: this.traffic,
      energyPulses: this.energyPulses,
      logisticsEfficiency:
        this.droneRoutes.reduce((sum, route) => sum + route.load, 0) / Math.max(this.droneRoutes.length, 1),
      energyBalance: clamp01(
        1 -
          controlledDistricts.reduce((sum, district) => sum + district.energyDemand * district.density, 0) /
            Math.max(civilization.resources.reduce((sum, resource) => sum + resource.energy, 0), 1)
      )
    };
  }

  snapshot(): MegacitySnapshot {
    return {
      tick: this.tick,
      districts: this.districts,
      droneRoutes: this.droneRoutes,
      traffic: this.traffic,
      energyPulses: this.energyPulses,
      logisticsEfficiency:
        this.droneRoutes.reduce((sum, route) => sum + route.load, 0) / Math.max(this.droneRoutes.length, 1),
      energyBalance: 0.7
    };
  }

  private createDistricts(grid: GridModel): readonly MegacityDistrict[] {
    const districts: MegacityDistrict[] = [];
    let index = 0;
    for (let y = 5; y < grid.height; y += 7) {
      for (let x = 5; x < grid.width; x += 9) {
        const kind = districtKinds[index % districtKinds.length]!;
        districts.push({
          id: `district-${index + 1}`,
          x,
          y,
          kind,
          density: 0.35 + ((index * 17) % 55) / 100,
          energyDemand: kind === "industrial" ? 42 : kind === "research" ? 34 : 24
        });
        index += 1;
      }
    }
    return districts;
  }

  private createDroneRoutes(): readonly DroneRoute[] {
    return this.districts.slice(0, 10).map((district, index) => {
      const target = this.districts[(index * 3 + 5) % this.districts.length] ?? district;
      return {
        id: `drone-${index + 1}`,
        from: district,
        to: target,
        progress: (index % 7) / 7,
        load: 0.42 + (index % 4) * 0.1
      };
    });
  }

  private createTraffic(): readonly TrafficFlow[] {
    return this.districts.slice(0, 12).map((district, index) => {
      const target = [...this.districts].sort((a, b) => manhattanDistance(district, a) - manhattanDistance(district, b))[index + 1] ?? district;
      return {
        id: `traffic-${index + 1}`,
        from: district,
        to: target,
        congestion: 0.18 + (index % 5) * 0.08,
        throughput: clamp01(0.82 - (positionKey(district).length % 5) * 0.06)
      };
    });
  }
}
