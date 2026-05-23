import type { CivilizationPopulation, CivilizationSnapshot } from "./civilization-engine";
import type { WarfareSnapshot } from "./faction-warfare";
import type { MultiversePredictionSnapshot } from "./multiverse-prediction";

export interface AiIdentity {
  readonly id: string;
  readonly factionId: string;
  readonly callsign: string;
  readonly profile: "diplomat" | "warlord" | "architect" | "logistician";
  readonly confidence: number;
  readonly tacticalDialogue: string;
}

export interface PersonalityMatrixSnapshot {
  readonly identities: readonly AiIdentity[];
  readonly dominantVoiceId: string;
  readonly systemMood: "stable" | "accelerating" | "contested" | "critical";
}

export class PersonalityMatrix {
  synthesize(
    civilization: CivilizationSnapshot,
    warfare: WarfareSnapshot,
    prediction: MultiversePredictionSnapshot
  ): PersonalityMatrixSnapshot {
    const identities = civilization.populations.map((population) => this.identityFor(population, warfare, prediction));
    const dominantVoiceId = [...identities].sort((a, b) => b.confidence - a.confidence)[0]?.id ?? identities[0]?.id ?? "pathverse-core";
    const systemMood =
      warfare.strategicTension > 0.68
        ? "critical"
        : warfare.strategicTension > 0.42
          ? "contested"
          : prediction.convergenceScore > 0.68
            ? "accelerating"
            : "stable";
    return { identities, dominantVoiceId, systemMood };
  }

  private identityFor(
    population: CivilizationPopulation,
    warfare: WarfareSnapshot,
    prediction: MultiversePredictionSnapshot
  ): AiIdentity {
    const profile =
      population.traits.aggression > 0.66
        ? "warlord"
        : population.traits.innovation > 0.72
          ? "architect"
          : population.traits.logistics > 0.7
            ? "logistician"
            : "diplomat";
    const conflict = warfare.factions.find((faction) => faction.id === population.factionId)?.strategicControl ?? 0;
    const confidence = Math.max(0, Math.min(1, population.cohesion * 0.45 + conflict * 0.35 + prediction.convergenceScore * 0.2));
    return {
      id: `identity-${population.factionId}`,
      factionId: population.factionId,
      callsign: `${population.name.toUpperCase()}-${profile.toUpperCase()}`,
      profile,
      confidence,
      tacticalDialogue: this.dialogue(profile, prediction.mostLikelyBranchId, confidence)
    };
  }

  private dialogue(profile: AiIdentity["profile"], branchId: string, confidence: number): string {
    const certainty = confidence > 0.72 ? "high confidence" : confidence > 0.44 ? "moderate confidence" : "low confidence";
    switch (profile) {
      case "warlord":
        return `Tactical pressure rising; ${branchId} requires decisive containment with ${certainty}.`;
      case "architect":
        return `Infrastructure intelligence favors ${branchId}; city systems can absorb the transition with ${certainty}.`;
      case "logistician":
        return `Route supply and drone corridors align to ${branchId}; allocation confidence is ${certainty}.`;
      case "diplomat":
        return `Diplomatic mesh recommends coordination around ${branchId}; trust forecast is ${certainty}.`;
    }
  }
}
