import { positionKey, manhattanDistance } from "../core/grid";
import type { GridPosition } from "../core/types";
import type { NeuralLearningSnapshot, NeuralCellSignal } from "./neural-learning-engine";
import type { CivilizationSnapshot } from "../civilization/civilization-engine";

export type ThoughtCategory = "reasoning" | "uncertainty" | "prediction" | "strategic";
export type CognitionMode = "exploration" | "exploitation" | "convergence";

export interface ThoughtPulse {
  readonly id: string;
  readonly position: GridPosition;
  readonly intensity: number;
  readonly frequency: number;
  readonly phase: number;
  readonly category: ThoughtCategory;
}

export interface UncertaintyWave {
  readonly origin: GridPosition;
  readonly radius: number;
  readonly maxRadius: number;
  readonly decay: number;
  readonly phase: number;
  readonly intensity: number;
}

export interface CognitionCell {
  readonly position: GridPosition;
  readonly activation: number;
  readonly mode: CognitionMode;
}

export interface CognitionField {
  readonly cells: readonly CognitionCell[];
  readonly focusCenter: GridPosition;
  readonly focusRadius: number;
  readonly dominantMode: CognitionMode;
}

export interface ThoughtPropagation {
  readonly from: GridPosition;
  readonly to: GridPosition;
  readonly strength: number;
  readonly delay: number;
  readonly progress: number;
}

export interface ThoughtStreamSnapshot {
  readonly tick: number;
  readonly pulses: readonly ThoughtPulse[];
  readonly waves: readonly UncertaintyWave[];
  readonly cognitionField: CognitionField;
  readonly propagations: readonly ThoughtPropagation[];
  readonly reasoningIntensity: number;
  readonly uncertaintyIndex: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const FREQUENCY: Record<ThoughtCategory, number> = {
  reasoning: 2.4,
  uncertainty: 1.2,
  prediction: 3.6,
  strategic: 1.8
};

const MAX_PULSES = 48;
const MAX_WAVES = 12;
const PHASE_STEP_FACTOR = 0.016 * Math.PI * 2;

export class ThoughtStreamEngine {
  private tick = 0;
  private pulses: ThoughtPulse[] = [];
  private waves: UncertaintyWave[] = [];
  private propagations: ThoughtPropagation[] = [];
  private pulseIdCounter = 0;

  step(neural: NeuralLearningSnapshot, civilization: CivilizationSnapshot): ThoughtStreamSnapshot {
    this.tick += 1;

    const influenceMap = new Map<string, string | undefined>();
    for (const cell of civilization.influence) {
      influenceMap.set(positionKey(cell), cell.controllerFactionId);
    }

    // --- Generate thought pulses from cell signals ---
    const rawPulses: ThoughtPulse[] = [];
    for (const signal of neural.cellSignals) {
      const category = this.classifySignal(signal, influenceMap);
      if (category === undefined) continue;
      const freq = FREQUENCY[category];
      rawPulses.push({
        id: `thought-pulse-${this.pulseIdCounter++}`,
        position: { x: signal.x, y: signal.y },
        intensity: this.pulseIntensity(signal, category),
        frequency: freq,
        phase: 0,
        category
      });
    }
    rawPulses.sort((a, b) => b.intensity - a.intensity);
    this.pulses = rawPulses.slice(0, MAX_PULSES).map((pulse) => ({
      ...pulse,
      phase: (pulse.phase + pulse.frequency * PHASE_STEP_FACTOR) % (Math.PI * 2)
    }));

    // --- Update existing waves ---
    this.waves = this.waves
      .map((wave) => ({
        ...wave,
        radius: wave.radius + 0.8,
        intensity: wave.intensity * (1 - wave.decay),
        phase: (wave.phase + 1.2 * PHASE_STEP_FACTOR) % (Math.PI * 2)
      }))
      .filter((wave) => wave.intensity >= 0.02 && wave.radius <= wave.maxRadius);

    // --- Generate new uncertainty waves from prediction variance ---
    const cellsByKey = new Map<string, NeuralCellSignal>();
    for (const signal of neural.cellSignals) {
      cellsByKey.set(positionKey(signal), signal);
    }
    const newWaves: UncertaintyWave[] = [];
    for (const signal of neural.cellSignals) {
      const neighbors: number[] = [];
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          if (dx === 0 && dy === 0) continue;
          const neighbor = cellsByKey.get(positionKey({ x: signal.x + dx, y: signal.y + dy }));
          if (neighbor) neighbors.push(neighbor.prediction);
        }
      }
      if (neighbors.length < 2) continue;
      const mean = neighbors.reduce((s, v) => s + v, 0) / neighbors.length;
      const variance = neighbors.reduce((s, v) => s + (v - mean) * (v - mean), 0) / neighbors.length;
      const stddev = Math.sqrt(variance);
      if (stddev > 0.22) {
        newWaves.push({
          origin: { x: signal.x, y: signal.y },
          radius: 0,
          maxRadius: 4 + stddev * 12,
          decay: clamp01(0.08 + stddev * 0.3),
          phase: 0,
          intensity: clamp01(stddev * 2)
        });
      }
    }
    newWaves.sort((a, b) => b.intensity - a.intensity);
    const waveSlots = MAX_WAVES - this.waves.length;
    if (waveSlots > 0) {
      this.waves = [...this.waves, ...newWaves.slice(0, waveSlots)];
    }

    // --- Generate thought propagations along bestPath ---
    this.propagations = [];
    const path = neural.bestPath;
    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i]!;
      const to = path[i + 1]!;
      this.propagations.push({
        from,
        to,
        strength: clamp01(1 - i / Math.max(path.length, 1)),
        delay: i * 45,
        progress: ((this.tick * 0.04) % 1 + i * 0.04) % 1
      });
    }

    // --- Build cognition field ---
    const cognitionField = this.buildCognitionField(neural);

    // --- Compute global metrics ---
    const reasoningPulses = this.pulses.filter((p) => p.category === "reasoning");
    const reasoningIntensity = reasoningPulses.length > 0
      ? reasoningPulses.reduce((s, p) => s + p.intensity, 0) / reasoningPulses.length
      : 0;

    const uncertaintyPulses = this.pulses.filter((p) => p.category === "uncertainty");
    const uncertaintyAvg = uncertaintyPulses.length > 0
      ? uncertaintyPulses.reduce((s, p) => s + p.intensity, 0) / uncertaintyPulses.length
      : 0;
    const uncertaintyIndex = clamp01(uncertaintyAvg + this.waves.length / MAX_WAVES);

    return {
      tick: this.tick,
      pulses: this.pulses,
      waves: this.waves,
      cognitionField,
      propagations: this.propagations,
      reasoningIntensity: clamp01(reasoningIntensity),
      uncertaintyIndex
    };
  }

  snapshot(): ThoughtStreamSnapshot {
    return {
      tick: this.tick,
      pulses: this.pulses,
      waves: this.waves,
      cognitionField: this.buildCognitionField(undefined),
      propagations: this.propagations,
      reasoningIntensity: 0,
      uncertaintyIndex: 0
    };
  }

  private classifySignal(signal: NeuralCellSignal, influenceMap: Map<string, string | undefined>): ThoughtCategory | undefined {
    const key = positionKey(signal);
    const factionId = influenceMap.get(key);
    const hasFrontierNeighbor = factionId !== undefined && this.isFrontier(signal, factionId, influenceMap);
    if (hasFrontierNeighbor) return "strategic";
    if (signal.confidence > 0.6) return "reasoning";
    if (signal.prediction > 0.5) return "prediction";
    if (signal.confidence < 0.3) return "uncertainty";
    return undefined;
  }

  private isFrontier(signal: NeuralCellSignal, factionId: string, influenceMap: Map<string, string | undefined>): boolean {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        if (dx === 0 && dy === 0) continue;
        const neighborKey = positionKey({ x: signal.x + dx, y: signal.y + dy });
        const neighborFaction = influenceMap.get(neighborKey);
        if (neighborFaction !== undefined && neighborFaction !== factionId) return true;
      }
    }
    return false;
  }

  private pulseIntensity(signal: NeuralCellSignal, category: ThoughtCategory): number {
    switch (category) {
      case "reasoning": return clamp01(signal.confidence * 0.7 + signal.prediction * 0.3);
      case "uncertainty": return clamp01((1 - signal.confidence) * 0.6 + signal.obstacleRisk * 0.4);
      case "prediction": return clamp01(signal.prediction * 0.8 + signal.confidence * 0.2);
      case "strategic": return clamp01(0.5 + signal.confidence * 0.3 + signal.prediction * 0.2);
    }
  }

  private buildCognitionField(neural: NeuralLearningSnapshot | undefined): CognitionField {
    if (!neural || neural.cellSignals.length === 0) {
      return { cells: [], focusCenter: { x: 0, y: 0 }, focusRadius: 0, dominantMode: "exploration" };
    }

    const convergence = neural.convergence;
    const cells: CognitionCell[] = [];
    for (const signal of neural.cellSignals) {
      const activation = clamp01((signal.confidence + signal.prediction) * 0.5);
      let mode: CognitionMode;
      if (convergence > 0.7) mode = "convergence";
      else if (signal.confidence > signal.prediction) mode = "exploitation";
      else mode = "exploration";
      cells.push({ position: { x: signal.x, y: signal.y }, activation, mode });
    }

    const highActivation = cells.filter((c) => c.activation > 0.5);
    let focusCenter: GridPosition;
    if (highActivation.length > 0) {
      const totalWeight = highActivation.reduce((s, c) => s + c.activation, 0);
      focusCenter = {
        x: Math.round(highActivation.reduce((s, c) => s + c.position.x * c.activation, 0) / totalWeight),
        y: Math.round(highActivation.reduce((s, c) => s + c.position.y * c.activation, 0) / totalWeight)
      };
    } else {
      focusCenter = { x: 0, y: 0 };
    }

    let focusRadius = 0;
    if (highActivation.length > 1) {
      const meanDist = highActivation.reduce((s, c) => s + manhattanDistance(c.position, focusCenter), 0) / highActivation.length;
      const variance = highActivation.reduce((s, c) => {
        const d = manhattanDistance(c.position, focusCenter) - meanDist;
        return s + d * d;
      }, 0) / highActivation.length;
      focusRadius = Math.sqrt(variance);
    }

    const modeAccum = new Map<CognitionMode, number>();
    for (const cell of cells) {
      modeAccum.set(cell.mode, (modeAccum.get(cell.mode) ?? 0) + cell.activation);
    }
    let dominantMode: CognitionMode = "exploration";
    let maxAccum = -1;
    for (const [mode, accum] of modeAccum) {
      if (accum > maxAccum) { dominantMode = mode; maxAccum = accum; }
    }

    return { cells, focusCenter, focusRadius, dominantMode };
  }
}
