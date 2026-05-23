import { describe, expect, it } from "vitest";
import { NeuralLearningEngine } from "@engine/ai/neural-learning-engine";
import { SwarmIntelligenceSystem } from "@engine/ai/swarm-intelligence";
import { createGrid } from "@engine/core/grid";
import { TelemetryEngine } from "@engine/telemetry/telemetry-engine";

describe("NeuralLearningEngine", () => {
  it("builds persistent neural memory and prediction signals", () => {
    const grid = createGrid(10, 8, { x: 0, y: 0 }, { x: 9, y: 7 }, [{ x: 2, y: 2 }]);
    const snapshot = new NeuralLearningEngine().train(grid, { epochs: 24 });

    expect(snapshot.memory.qValues.size).toBeGreaterThan(0);
    expect(snapshot.cellSignals.length).toBeGreaterThan(0);
    expect(snapshot.confidence).toBeGreaterThanOrEqual(0);
    expect(snapshot.convergence).toBeGreaterThanOrEqual(0);
  });

  it("feeds neural and swarm telemetry", () => {
    const grid = createGrid(12, 9, { x: 1, y: 1 }, { x: 10, y: 7 });
    const neural = new NeuralLearningEngine().train(grid, { epochs: 18 });
    const swarm = new SwarmIntelligenceSystem(grid, 4).step(grid, neural);
    const telemetry = new TelemetryEngine();

    telemetry.recordNeural(neural);
    telemetry.recordSwarm(swarm);
    const snapshot = telemetry.snapshot();

    expect(snapshot.neural?.memoryEntries).toBeGreaterThan(0);
    expect(snapshot.swarm?.agentCount).toBe(4);
  });
});
