import { getNeighbors, positionKey } from "../core/grid";
import type { GridCell, GridModel, GridPosition } from "../core/types";
import type { NeuralLearningSnapshot } from "../ai/neural-learning-engine";
import type { SwarmSnapshot } from "../ai/swarm-intelligence";

export type CivilizationStrategy = "expansion" | "cooperation" | "fortification" | "research";

export interface CivilizationTraits {
  readonly aggression: number;
  readonly cooperation: number;
  readonly innovation: number;
  readonly logistics: number;
}

export interface CivilizationPopulation {
  readonly id: string;
  readonly name: string;
  readonly factionId: string;
  readonly capital: GridPosition;
  readonly territory: readonly GridPosition[];
  readonly population: number;
  readonly energy: number;
  readonly materials: number;
  readonly cohesion: number;
  readonly strategy: CivilizationStrategy;
  readonly traits: CivilizationTraits;
  readonly memory: readonly string[];
}

export interface ResourceNode extends GridPosition {
  readonly id: string;
  readonly energy: number;
  readonly materials: number;
  readonly volatility: number;
  readonly controllerFactionId?: string;
}

export interface InfluenceCell extends GridPosition {
  readonly controllerFactionId?: string;
  readonly pressure: number;
  readonly stability: number;
}

export interface CivilizationSnapshot {
  readonly tick: number;
  readonly populations: readonly CivilizationPopulation[];
  readonly resources: readonly ResourceNode[];
  readonly influence: readonly InfluenceCell[];
  readonly totalPopulation: number;
  readonly resourcePressure: number;
  readonly collaborationIndex: number;
  readonly conflictIndex: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const seedPopulations = (grid: GridModel): readonly CivilizationPopulation[] => [
  {
    id: "civ-aurelia",
    name: "Aurelia",
    factionId: "faction-aurelia",
    capital: { x: Math.max(1, Math.floor(grid.width * 0.16)), y: Math.max(1, Math.floor(grid.height * 0.22)) },
    territory: [],
    population: 4200,
    energy: 860,
    materials: 620,
    cohesion: 0.72,
    strategy: "research",
    traits: { aggression: 0.22, cooperation: 0.78, innovation: 0.86, logistics: 0.64 },
    memory: ["founded-neural-civic-core"]
  },
  {
    id: "civ-vantablade",
    name: "Vantablade",
    factionId: "faction-vantablade",
    capital: { x: Math.floor(grid.width * 0.78), y: Math.floor(grid.height * 0.28) },
    territory: [],
    population: 3800,
    energy: 740,
    materials: 880,
    cohesion: 0.66,
    strategy: "expansion",
    traits: { aggression: 0.72, cooperation: 0.28, innovation: 0.48, logistics: 0.82 },
    memory: ["secured-autonomous-drone-yards"]
  },
  {
    id: "civ-novaris",
    name: "Novaris",
    factionId: "faction-novaris",
    capital: { x: Math.floor(grid.width * 0.52), y: Math.floor(grid.height * 0.76) },
    territory: [],
    population: 3100,
    energy: 960,
    materials: 540,
    cohesion: 0.81,
    strategy: "cooperation",
    traits: { aggression: 0.34, cooperation: 0.88, innovation: 0.62, logistics: 0.58 },
    memory: ["activated-distributed-logistics-pact"]
  }
];

export class CivilizationEngine {
  private tick = 0;
  private populations: readonly CivilizationPopulation[];
  private resources: readonly ResourceNode[];

  constructor(grid: GridModel) {
    this.populations = seedPopulations(grid).map((population) => ({
      ...population,
      territory: this.seedTerritory(grid, population.capital, 10)
    }));
    this.resources = this.seedResources(grid);
  }

  step(grid: GridModel, neural: NeuralLearningSnapshot, swarm: SwarmSnapshot): CivilizationSnapshot {
    this.tick += 1;
    const signalMap = new Map(neural.cellSignals.map((signal) => [positionKey(signal), signal]));
    const influence = this.computeInfluence(grid);
    const influenceMap = new Map(influence.map((cell) => [positionKey(cell), cell]));

    this.resources = this.resources.map((resource) => {
      const controllerFactionId = this.nearestPopulation(resource)?.factionId;
      return {
        ...resource,
        ...(controllerFactionId ? { controllerFactionId } : {}),
        energy: Math.max(80, resource.energy * (0.997 + resource.volatility * 0.002)),
        materials: Math.max(80, resource.materials * (0.996 + resource.volatility * 0.002))
      };
    });

    this.populations = this.populations.map((population) => {
      const controlledResources = this.resources.filter((resource) => resource.controllerFactionId === population.factionId);
      const resourceGain = controlledResources.reduce((sum, resource) => sum + resource.energy * 0.004 + resource.materials * 0.003, 0);
      const swarmSupport = swarm.formationScore * population.traits.logistics * 28;
      const neuralSupport =
        population.territory.reduce((sum, position) => sum + (signalMap.get(positionKey(position))?.prediction ?? 0), 0) /
        Math.max(population.territory.length, 1);
      const pressure =
        population.territory.reduce((sum, position) => sum + (influenceMap.get(positionKey(position))?.pressure ?? 0), 0) /
        Math.max(population.territory.length, 1);
      const strategy = this.chooseStrategy(population, pressure, neural.convergence);
      const territory = this.expandTerritory(grid, population, signalMap, strategy);
      const conflictPenalty = pressure * population.traits.aggression * 18;
      const cooperationBonus = population.traits.cooperation * this.computeCollaborationIndex() * 24;

      return {
        ...population,
        strategy,
        territory,
        energy: Math.max(0, population.energy + resourceGain + neuralSupport * 20 - conflictPenalty),
        materials: Math.max(0, population.materials + resourceGain * 0.8 + swarmSupport - territory.length * 0.15),
        population: Math.round(population.population + population.cohesion * 17 + cooperationBonus - pressure * 22),
        cohesion: clamp01(population.cohesion + population.traits.cooperation * 0.008 + neural.convergence * 0.006 - pressure * 0.018),
        memory: this.appendMemory(population.memory, `${this.tick}:${strategy}:${territory.length}`)
      };
    });

    const nextInfluence = this.computeInfluence(grid);
    return this.snapshot(nextInfluence);
  }

  snapshot(influence?: readonly InfluenceCell[]): CivilizationSnapshot {
    const resolvedInfluence = influence ?? [];
    const totalPopulation = this.populations.reduce((sum, population) => sum + population.population, 0);
    const totalResource = this.resources.reduce((sum, resource) => sum + resource.energy + resource.materials, 0);
    const demand = this.populations.reduce((sum, population) => sum + population.population * 0.22, 0);
    return {
      tick: this.tick,
      populations: this.populations,
      resources: this.resources,
      influence: resolvedInfluence,
      totalPopulation,
      resourcePressure: clamp01(demand / Math.max(totalResource, 1)),
      collaborationIndex: this.computeCollaborationIndex(),
      conflictIndex: this.computeConflictIndex(resolvedInfluence)
    };
  }

  private seedTerritory(grid: GridModel, capital: GridPosition, radius: number): readonly GridPosition[] {
    return grid.cells
      .filter((cell) => cell.kind !== "wall")
      .filter((cell) => Math.abs(cell.x - capital.x) + Math.abs(cell.y - capital.y) <= radius)
      .map((cell) => ({ x: cell.x, y: cell.y }));
  }

  private seedResources(grid: GridModel): readonly ResourceNode[] {
    const anchors: readonly GridPosition[] = [
      { x: Math.floor(grid.width * 0.26), y: Math.floor(grid.height * 0.62) },
      { x: Math.floor(grid.width * 0.64), y: Math.floor(grid.height * 0.18) },
      { x: Math.floor(grid.width * 0.82), y: Math.floor(grid.height * 0.78) },
      { x: Math.floor(grid.width * 0.34), y: Math.floor(grid.height * 0.34) }
    ];
    return anchors.map((anchor, index) => ({
      id: `resource-${index + 1}`,
      x: anchor.x,
      y: anchor.y,
      energy: 620 + index * 110,
      materials: 460 + index * 130,
      volatility: 0.25 + index * 0.11
    }));
  }

  private computeInfluence(grid: GridModel): readonly InfluenceCell[] {
    return grid.cells
      .filter((cell) => cell.kind !== "wall")
      .map((cell) => {
        const scored = this.populations.map((population) => {
          const distance = Math.abs(population.capital.x - cell.x) + Math.abs(population.capital.y - cell.y);
          const territoryBonus = population.territory.some((position) => position.x === cell.x && position.y === cell.y) ? 1.8 : 0;
          return {
            population,
            score: territoryBonus + population.cohesion * 2 + population.traits.logistics - distance / 14
          };
        });
        const sorted = scored.sort((a, b) => b.score - a.score);
        const primary = sorted[0];
        const secondary = sorted[1];
        const pressure = primary && secondary ? clamp01(1 - Math.abs(primary.score - secondary.score) / 3) : 0;
        return {
          x: cell.x,
          y: cell.y,
          ...(primary?.score && primary.score > -0.8 ? { controllerFactionId: primary.population.factionId } : {}),
          pressure,
          stability: clamp01((primary?.population.cohesion ?? 0.5) - pressure * 0.4)
        };
      });
  }

  private expandTerritory(
    grid: GridModel,
    population: CivilizationPopulation,
    signalMap: ReadonlyMap<string, { readonly prediction: number; readonly confidence: number }>,
    strategy: CivilizationStrategy
  ): readonly GridPosition[] {
    const current = new Map(population.territory.map((position) => [positionKey(position), position]));
    const frontier = population.territory.flatMap((position) => getNeighbors(grid, position));
    const candidates = frontier
      .filter((cell) => !current.has(positionKey(cell)))
      .sort((a, b) => this.expansionScore(b, signalMap, strategy) - this.expansionScore(a, signalMap, strategy))
      .slice(0, strategy === "expansion" ? 4 : 2);

    for (const candidate of candidates) {
      current.set(positionKey(candidate), { x: candidate.x, y: candidate.y });
    }
    const maxTerritory = strategy === "fortification" ? 72 : 92;
    return [...current.values()].slice(-maxTerritory);
  }

  private expansionScore(
    cell: GridCell,
    signalMap: ReadonlyMap<string, { readonly prediction: number; readonly confidence: number }>,
    strategy: CivilizationStrategy
  ): number {
    const neural = signalMap.get(positionKey(cell));
    const resourceValue = this.resources.reduce((score, resource) => {
      const distance = Math.abs(resource.x - cell.x) + Math.abs(resource.y - cell.y);
      return score + 1 / Math.max(1, distance);
    }, 0);
    const strategyBias = strategy === "research" ? neural?.prediction ?? 0 : strategy === "expansion" ? resourceValue : 0.2;
    return resourceValue + (neural?.confidence ?? 0) + strategyBias - cell.weight * 0.04;
  }

  private chooseStrategy(
    population: CivilizationPopulation,
    pressure: number,
    convergence: number
  ): CivilizationStrategy {
    if (pressure > 0.68) return population.traits.aggression > 0.55 ? "expansion" : "fortification";
    if (convergence > 0.72 && population.traits.innovation > 0.6) return "research";
    if (population.traits.cooperation > population.traits.aggression) return "cooperation";
    return "expansion";
  }

  private nearestPopulation(position: GridPosition): CivilizationPopulation | undefined {
    return [...this.populations].sort((a, b) => {
      const distanceA = Math.abs(a.capital.x - position.x) + Math.abs(a.capital.y - position.y);
      const distanceB = Math.abs(b.capital.x - position.x) + Math.abs(b.capital.y - position.y);
      return distanceA - distanceB;
    })[0];
  }

  private computeCollaborationIndex(): number {
    const averageCooperation =
      this.populations.reduce((sum, population) => sum + population.traits.cooperation * population.cohesion, 0) /
      Math.max(this.populations.length, 1);
    return clamp01(averageCooperation);
  }

  private computeConflictIndex(influence: readonly InfluenceCell[]): number {
    if (influence.length === 0) return 0;
    return clamp01(influence.reduce((sum, cell) => sum + cell.pressure, 0) / influence.length);
  }

  private appendMemory(memory: readonly string[], entry: string): readonly string[] {
    return [...memory.slice(-8), entry];
  }
}
