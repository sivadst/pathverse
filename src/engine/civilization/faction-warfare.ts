import type { CivilizationPopulation, CivilizationSnapshot } from "./civilization-engine";

export type DiplomaticPosture = "allied" | "neutral" | "rival" | "war";

export interface FactionState {
  readonly id: string;
  readonly name: string;
  readonly aggression: number;
  readonly diplomacy: number;
  readonly strategicControl: number;
  readonly resources: number;
}

export interface DiplomaticRelation {
  readonly fromFactionId: string;
  readonly toFactionId: string;
  readonly posture: DiplomaticPosture;
  readonly trust: number;
}

export interface WarfareSnapshot {
  readonly tick: number;
  readonly factions: readonly FactionState[];
  readonly diplomacy: readonly DiplomaticRelation[];
  readonly strategicTension: number;
  readonly dominantFactionId?: string;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export class FactionWarfareEngine {
  private tick = 0;
  private relations: readonly DiplomaticRelation[] = [];

  step(civilization: CivilizationSnapshot): WarfareSnapshot {
    this.tick += 1;
    const factions = civilization.populations.map((population) => this.populationToFaction(population, civilization));
    this.relations = this.computeRelations(civilization.populations);
    const strategicTension =
      this.relations.reduce((sum, relation) => sum + (relation.posture === "war" ? 1 : relation.posture === "rival" ? 0.55 : 0.08), 0) /
      Math.max(this.relations.length, 1);
    const dominantFactionId = [...factions].sort((a, b) => b.strategicControl - a.strategicControl)[0]?.id;

    return {
      tick: this.tick,
      factions,
      diplomacy: this.relations,
      strategicTension: clamp01(strategicTension),
      ...(dominantFactionId ? { dominantFactionId } : {})
    };
  }

  private populationToFaction(population: CivilizationPopulation, civilization: CivilizationSnapshot): FactionState {
    const controlledResources = civilization.resources.filter((resource) => resource.controllerFactionId === population.factionId);
    const resources = controlledResources.reduce((sum, resource) => sum + resource.energy + resource.materials, 0);
    const territoryShare = population.territory.length / Math.max(civilization.influence.length, 1);
    return {
      id: population.factionId,
      name: population.name,
      aggression: population.traits.aggression,
      diplomacy: population.traits.cooperation * population.cohesion,
      strategicControl: clamp01(territoryShare * 2.4 + resources / 5000 + population.cohesion * 0.2),
      resources
    };
  }

  private computeRelations(populations: readonly CivilizationPopulation[]): readonly DiplomaticRelation[] {
    const relations: DiplomaticRelation[] = [];
    for (const from of populations) {
      for (const to of populations) {
        if (from.factionId === to.factionId) continue;
        const trust = clamp01((from.traits.cooperation + to.traits.cooperation) / 2 - (from.traits.aggression + to.traits.aggression) / 3);
        const posture: DiplomaticPosture =
          trust > 0.68 ? "allied" : trust > 0.42 ? "neutral" : from.traits.aggression + to.traits.aggression > 1.2 ? "war" : "rival";
        relations.push({
          fromFactionId: from.factionId,
          toFactionId: to.factionId,
          posture,
          trust
        });
      }
    }
    return relations;
  }
}
