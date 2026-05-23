"use client";

import { create } from "zustand";
import { PATHFINDERS } from "../algorithms";
import { BattleOrchestrator } from "../battle/battle-orchestrator";
import { createGrid } from "../core/grid";
import type { AlgorithmId, BattleResult, GridModel, PathfinderEvent } from "../core/types";
import { LearningAgent, type LearningSnapshot } from "../ai/learning-agent";
import { NeuralMemoryStore } from "../ai/neural-memory";
import { SwarmIntelligenceSystem, type SwarmSnapshot } from "../ai/swarm-intelligence";
import { CivilizationEngine, type CivilizationSnapshot } from "../civilization/civilization-engine";
import { FactionWarfareEngine, type WarfareSnapshot } from "../civilization/faction-warfare";
import { MegacitySimulation, type MegacitySnapshot } from "../civilization/megacity-simulation";
import { MultiversePredictionEngine, type MultiversePredictionSnapshot } from "../civilization/multiverse-prediction";
import { PersonalityMatrix, type PersonalityMatrixSnapshot } from "../civilization/personality-matrix";
import { TemporalMemoryEngine, TemporalMemoryStore, type TemporalMemorySnapshot } from "../civilization/temporal-memory-engine";
import { ThoughtStreamEngine, type ThoughtStreamSnapshot } from "../ai/thought-stream-engine";
import { TelemetryEngine, type TelemetrySnapshot } from "../telemetry/telemetry-engine";

export interface CommandShellEntry {
  readonly id: string;
  readonly command: string;
  readonly output: string;
  readonly timestamp: number;
}

interface CommandCenterState {
  readonly grid: GridModel;
  readonly selectedAlgorithm: AlgorithmId;
  readonly battle: BattleResult | undefined;
  readonly events: readonly PathfinderEvent[];
  readonly learning: LearningSnapshot;
  readonly swarm: SwarmSnapshot;
  readonly civilization: CivilizationSnapshot;
  readonly megacity: MegacitySnapshot;
  readonly warfare: WarfareSnapshot;
  readonly prediction: MultiversePredictionSnapshot;
  readonly personality: PersonalityMatrixSnapshot;
  readonly thought: ThoughtStreamSnapshot;
  readonly temporalMemory: TemporalMemorySnapshot;
  readonly shell: readonly CommandShellEntry[];
  readonly telemetry: TelemetrySnapshot;
  selectAlgorithm: (algorithm: AlgorithmId) => void;
  runBattle: () => void;
  trainNeural: (epochs?: number) => void;
  stepSwarm: () => void;
  stepCivilization: () => void;
  runCommand: (command: string) => void;
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
const memoryStore = new NeuralMemoryStore();
const swarmSystem = new SwarmIntelligenceSystem(missionGrid);
const civilizationEngine = new CivilizationEngine(missionGrid);
const megacitySimulation = new MegacitySimulation(missionGrid);
const warfareEngine = new FactionWarfareEngine();
const predictionEngine = new MultiversePredictionEngine();
const personalityMatrix = new PersonalityMatrix();
const thoughtEngine = new ThoughtStreamEngine();
const temporalMemoryEngine = new TemporalMemoryEngine();
const temporalMemoryStore = new TemporalMemoryStore();
const initialLearning = learningAgent.train(missionGrid, 52);
telemetryEngine.recordNeural(initialLearning.neural);
const initialSwarm = swarmSystem.step(missionGrid, initialLearning.neural);
telemetryEngine.recordSwarm(initialSwarm);
const initialCivilization = civilizationEngine.step(missionGrid, initialLearning.neural, initialSwarm);
const initialMegacity = megacitySimulation.step(initialCivilization);
const initialWarfare = warfareEngine.step(initialCivilization);
const initialPrediction = predictionEngine.forecast(initialCivilization, initialMegacity, initialWarfare);
const initialPersonality = personalityMatrix.synthesize(initialCivilization, initialWarfare, initialPrediction);
const initialThought = thoughtEngine.step(initialLearning.neural, initialCivilization);
const initialTemporalMemory = temporalMemoryEngine.record(initialCivilization, initialWarfare);
telemetryEngine.recordCivilization(initialCivilization, initialMegacity, initialWarfare, initialPrediction);
telemetryEngine.recordConsciousness(initialThought);
telemetryEngine.recordTemporalMemory(initialTemporalMemory);
temporalMemoryStore.saveQuick(initialTemporalMemory);

const createShellEntry = (command: string, output: string): CommandShellEntry => ({
  id: crypto.randomUUID(),
  command,
  output,
  timestamp: performance.now()
});

export const useCommandCenterStore = create<CommandCenterState>((set, get) => ({
  grid: missionGrid,
  selectedAlgorithm: "astar",
  battle: undefined,
  events: [],
  learning: initialLearning,
  swarm: initialSwarm,
  civilization: initialCivilization,
  megacity: initialMegacity,
  warfare: initialWarfare,
  prediction: initialPrediction,
  personality: initialPersonality,
  thought: initialThought,
  temporalMemory: initialTemporalMemory,
  shell: [
    createShellEntry("boot", "Civilization substrate synchronized. Megacity, faction, and multiverse systems online.")
  ],
  telemetry: telemetryEngine.snapshot(),
  selectAlgorithm: (algorithm) => set({ selectedAlgorithm: algorithm }),
  runBattle: () => {
    const battle = battleOrchestrator.run(get().grid, { algorithms: PATHFINDERS, telemetry: telemetryEngine });
    const selected = battle.contestants.find((contestant) => contestant.algorithm === get().selectedAlgorithm) ?? battle.winner;
    set({ battle, events: selected.result.events, telemetry: telemetryEngine.snapshot() });
  },
  trainNeural: (epochs = 18) => {
    const learning = learningAgent.train(get().grid, epochs);
    memoryStore.save(learning.neural.memory);
    telemetryEngine.recordNeural(learning.neural);
    set({ learning, telemetry: telemetryEngine.snapshot() });
  },
  stepSwarm: () => {
    const swarm = swarmSystem.step(get().grid, get().learning.neural);
    telemetryEngine.recordSwarm(swarm);
    set({ swarm, telemetry: telemetryEngine.snapshot() });
  },
  stepCivilization: () => {
    const swarm = swarmSystem.step(get().grid, get().learning.neural);
    const civilization = civilizationEngine.step(get().grid, get().learning.neural, swarm);
    const megacity = megacitySimulation.step(civilization);
    const warfare = warfareEngine.step(civilization);
    const prediction = predictionEngine.forecast(civilization, megacity, warfare);
    const personality = personalityMatrix.synthesize(civilization, warfare, prediction);
    const thought = thoughtEngine.step(get().learning.neural, civilization);
    const temporalMemory = temporalMemoryEngine.record(civilization, warfare);
    telemetryEngine.recordSwarm(swarm);
    telemetryEngine.recordCivilization(civilization, megacity, warfare, prediction);
    telemetryEngine.recordConsciousness(thought);
    telemetryEngine.recordTemporalMemory(temporalMemory);
    temporalMemoryStore.saveQuick(temporalMemory);
    set({ swarm, civilization, megacity, warfare, prediction, personality, thought, temporalMemory, telemetry: telemetryEngine.snapshot() });
  },
  runCommand: (command) => {
    const normalized = command.trim().toLowerCase();
    if (normalized === "simulate" || normalized === "tick") {
      get().stepCivilization();
      set((state) => ({
        shell: [...state.shell.slice(-5), createShellEntry(command, `Advanced civilization tick ${get().civilization.tick + 1}.`)]
      }));
      return;
    }
    if (normalized === "predict") {
      const prediction = predictionEngine.forecast(get().civilization, get().megacity, get().warfare, 144);
      const personality = personalityMatrix.synthesize(get().civilization, get().warfare, prediction);
      telemetryEngine.recordCivilization(get().civilization, get().megacity, get().warfare, prediction);
      set((state) => ({
        prediction,
        personality,
        telemetry: telemetryEngine.snapshot(),
        shell: [...state.shell.slice(-5), createShellEntry(command, `Forecast locked on ${prediction.mostLikelyBranchId}.`)]
      }));
      return;
    }
    if (normalized === "train") {
      get().trainNeural(24);
      set((state) => ({
        shell: [...state.shell.slice(-5), createShellEntry(command, "Neural core trained for 24 epochs.")]
      }));
      return;
    }
    if (normalized === "battle") {
      get().runBattle();
      set((state) => ({
        shell: [...state.shell.slice(-5), createShellEntry(command, "Algorithm race initiated.")]
      }));
      return;
    }
    set((state) => ({
      shell: [...state.shell.slice(-5), createShellEntry(command, "Commands: simulate, predict, train, battle.")]
    }));
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
