import { describe, expect, it } from "vitest";
import { NeuralLearningEngine } from "@engine/ai/neural-learning-engine";
import { SwarmIntelligenceSystem } from "@engine/ai/swarm-intelligence";
import { CivilizationEngine } from "@engine/civilization/civilization-engine";
import { FactionWarfareEngine } from "@engine/civilization/faction-warfare";
import { MegacitySimulation } from "@engine/civilization/megacity-simulation";
import { MultiversePredictionEngine } from "@engine/civilization/multiverse-prediction";
import { PersonalityMatrix } from "@engine/civilization/personality-matrix";
import { createGrid } from "@engine/core/grid";
import { TelemetryEngine } from "@engine/telemetry/telemetry-engine";

describe("civilization simulation", () => {
  it("evolves populations, megacity logistics, factions, and future branches", () => {
    const grid = createGrid(32, 24, { x: 1, y: 1 }, { x: 30, y: 22 });
    const neural = new NeuralLearningEngine().train(grid, { epochs: 16 });
    const swarm = new SwarmIntelligenceSystem(grid, 5).step(grid, neural);
    const civilization = new CivilizationEngine(grid).step(grid, neural, swarm);
    const megacity = new MegacitySimulation(grid).step(civilization);
    const warfare = new FactionWarfareEngine().step(civilization);
    const prediction = new MultiversePredictionEngine().forecast(civilization, megacity, warfare);
    const personality = new PersonalityMatrix().synthesize(civilization, warfare, prediction);

    expect(civilization.populations).toHaveLength(3);
    expect(civilization.resources.length).toBeGreaterThan(0);
    expect(megacity.droneRoutes.length).toBeGreaterThan(0);
    expect(warfare.diplomacy.length).toBeGreaterThan(0);
    expect(prediction.branches).toHaveLength(4);
    expect(personality.identities).toHaveLength(3);
  });

  it("records civilization telemetry", () => {
    const grid = createGrid(28, 20, { x: 1, y: 1 }, { x: 26, y: 18 });
    const neural = new NeuralLearningEngine().train(grid, { epochs: 12 });
    const swarm = new SwarmIntelligenceSystem(grid, 4).step(grid, neural);
    const civilization = new CivilizationEngine(grid).step(grid, neural, swarm);
    const megacity = new MegacitySimulation(grid).step(civilization);
    const warfare = new FactionWarfareEngine().step(civilization);
    const prediction = new MultiversePredictionEngine().forecast(civilization, megacity, warfare);
    const telemetry = new TelemetryEngine();

    telemetry.recordCivilization(civilization, megacity, warfare, prediction);

    expect(telemetry.snapshot().civilization?.timelineBranches).toBe(4);
    expect(telemetry.snapshot().civilization?.totalPopulation).toBeGreaterThan(0);
  });
});
