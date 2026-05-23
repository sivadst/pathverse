"use client";

import { create } from "zustand";
import { PATHFINDERS } from "../algorithms";
import { BattleOrchestrator } from "../battle/battle-orchestrator";
import { createGrid } from "../core/grid";
import type { AlgorithmId, BattleResult, GridModel, PathfinderEvent } from "../core/types";
import { LearningAgent, type LearningSnapshot } from "../ai/learning-agent";
import { TelemetryEngine, type TelemetrySnapshot } from "../telemetry/telemetry-engine";

interface CommandCenterState {
  readonly grid: GridModel;
  readonly selectedAlgorithm: AlgorithmId;
  readonly battle: BattleResult | undefined;
  readonly events: readonly PathfinderEvent[];
  readonly learning: LearningSnapshot;
  readonly telemetry: TelemetrySnapshot;
  selectAlgorithm: (algorithm: AlgorithmId) => void;
  runBattle: () => void;
  ingestEvents: (events: readonly PathfinderEvent[]) => void;
  refreshTelemetry: () => void;
}

const createMissionGrid = (): GridModel => {
  const walls = [
    ...Array.from({ length: 28 }, (_, y) => ({ x: 16, y })).filter((p) => p.y !== 14),
    ...Array.from({ length: 24 }, (_, y) => ({ x: 34, y: y + 8 })).filter((p) => p.y !== 24),
    ...Array.from({ length: 20 }, (_, x) => ({ x: x + 20, y: 20 })).filter((p) => p.x !== 27)
  ];
  const weighted = Array.from({ length: 13 }, (_, index) => ({ x: 8 + index, y: 8 + (index % 6), weight: 5 }));
  return createGrid(52, 32, { x: 3, y: 3 }, { x: 48, y: 28 }, walls, weighted);
};

const telemetryEngine = new TelemetryEngine();
const battleOrchestrator = new BattleOrchestrator();
const learningAgent = new LearningAgent();
const missionGrid = createMissionGrid();

export const useCommandCenterStore = create<CommandCenterState>((set, get) => ({
  grid: missionGrid,
  selectedAlgorithm: "astar",
  battle: undefined,
  events: [],
  learning: learningAgent.train(missionGrid, 36),
  telemetry: telemetryEngine.snapshot(),
  selectAlgorithm: (algorithm) => set({ selectedAlgorithm: algorithm }),
  runBattle: () => {
    const battle = battleOrchestrator.run(get().grid, { algorithms: PATHFINDERS, telemetry: telemetryEngine });
    const selected = battle.contestants.find((contestant) => contestant.algorithm === get().selectedAlgorithm) ?? battle.winner;
    set({ battle, events: selected.result.events, telemetry: telemetryEngine.snapshot() });
  },
  ingestEvents: (events) =>
    set((state) => ({
      events: [...state.events, ...events],
      telemetry: telemetryEngine.snapshot()
    })),
  refreshTelemetry: () => set({ telemetry: telemetryEngine.snapshot() })
}));

export const commandCenterAlgorithms = PATHFINDERS;
export const commandCenterTelemetry = telemetryEngine;
