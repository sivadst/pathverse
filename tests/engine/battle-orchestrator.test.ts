import { describe, expect, it } from "vitest";
import { BattleOrchestrator } from "@engine/battle/battle-orchestrator";
import { createGrid } from "@engine/core/grid";

describe("BattleOrchestrator", () => {
  it("ranks algorithms and returns a winner", () => {
    const grid = createGrid(12, 12, { x: 1, y: 1 }, { x: 10, y: 10 });
    const battle = new BattleOrchestrator().run(grid, { algorithms: ["astar", "bfs", "dijkstra"] });

    expect(battle.winner.rank).toBe(1);
    expect(battle.contestants).toHaveLength(3);
    expect(battle.contestants.every((contestant) => contestant.result.reached)).toBe(true);
  });
});
