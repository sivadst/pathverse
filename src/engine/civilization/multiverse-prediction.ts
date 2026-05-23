import type { CivilizationSnapshot } from "./civilization-engine";
import type { MegacitySnapshot } from "./megacity-simulation";
import type { WarfareSnapshot } from "./faction-warfare";

export interface TimelineBranch {
  readonly id: string;
  readonly label: string;
  readonly probability: number;
  readonly horizonTicks: number;
  readonly populationDelta: number;
  readonly conflictRisk: number;
  readonly resourceRisk: number;
  readonly convergence: number;
}

export interface MultiversePredictionSnapshot {
  readonly tick: number;
  readonly branches: readonly TimelineBranch[];
  readonly mostLikelyBranchId: string;
  readonly convergenceScore: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export class MultiversePredictionEngine {
  private tick = 0;

  forecast(
    civilization: CivilizationSnapshot,
    megacity: MegacitySnapshot,
    warfare: WarfareSnapshot,
    horizonTicks = 96
  ): MultiversePredictionSnapshot {
    this.tick += 1;
    const branches: readonly TimelineBranch[] = [
      this.branch("timeline-civic", "Civic Ascendance", civilization, megacity, warfare, horizonTicks, 0.18, -0.14),
      this.branch("timeline-war", "Strategic Fracture", civilization, megacity, warfare, horizonTicks, -0.08, 0.28),
      this.branch("timeline-logistics", "Logistics Singularity", civilization, megacity, warfare, horizonTicks, 0.12, -0.06),
      this.branch("timeline-resource", "Resource Shock", civilization, megacity, warfare, horizonTicks, -0.16, 0.16)
    ];
    const normalized = this.normalize(branches);
    const mostLikelyBranchId = [...normalized].sort((a, b) => b.probability - a.probability)[0]?.id ?? "timeline-civic";
    const convergenceScore = clamp01(1 - normalized.reduce((sum, branch) => sum + Math.abs(branch.probability - 0.25), 0) / 2);

    return {
      tick: this.tick,
      branches: normalized,
      mostLikelyBranchId,
      convergenceScore
    };
  }

  private branch(
    id: string,
    label: string,
    civilization: CivilizationSnapshot,
    megacity: MegacitySnapshot,
    warfare: WarfareSnapshot,
    horizonTicks: number,
    growthBias: number,
    conflictBias: number
  ): TimelineBranch {
    const resourceRisk = clamp01(civilization.resourcePressure + (1 - megacity.energyBalance) * 0.5);
    const conflictRisk = clamp01(warfare.strategicTension + conflictBias);
    const logisticsBonus = megacity.logisticsEfficiency * 0.16;
    const populationDelta = Math.round(
      civilization.totalPopulation * (growthBias + civilization.collaborationIndex * 0.08 + logisticsBonus - conflictRisk * 0.06)
    );
    const rawProbability = clamp01(0.2 + civilization.collaborationIndex * 0.2 + logisticsBonus - conflictRisk * 0.2 - resourceRisk * 0.12);
    return {
      id,
      label,
      probability: rawProbability,
      horizonTicks,
      populationDelta,
      conflictRisk,
      resourceRisk,
      convergence: clamp01(1 - Math.abs(populationDelta) / Math.max(civilization.totalPopulation, 1) - conflictRisk * 0.25)
    };
  }

  private normalize(branches: readonly TimelineBranch[]): readonly TimelineBranch[] {
    const total = branches.reduce((sum, branch) => sum + branch.probability, 0) || 1;
    return branches.map((branch) => ({ ...branch, probability: branch.probability / total }));
  }
}
