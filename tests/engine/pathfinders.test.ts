import { describe, expect, it } from "vitest";
import { PATHFINDERS, runPathfinder } from "@engine/algorithms";
import { createGrid } from "@engine/core/grid";

describe("pathfinding engine", () => {
  const grid = createGrid(
    8,
    6,
    { x: 0, y: 0 },
    { x: 7, y: 5 },
    [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 }
    ]
  );

  it.each(PATHFINDERS)("finds a route with %s", (algorithm) => {
    const result = runPathfinder(algorithm, grid);

    expect(result.reached).toBe(true);
    expect(result.path.at(0)).toEqual(grid.start);
    expect(result.path.at(-1)).toEqual(grid.target);
    expect(result.metrics.visitedNodes).toBeGreaterThan(0);
    expect(result.events.some((event) => event.type === "path")).toBe(true);
  });

  it("keeps A* competitive with Dijkstra on weighted grids", () => {
    const astar = runPathfinder("astar", grid);
    const dijkstra = runPathfinder("dijkstra", grid);

    expect(astar.metrics.pathCost).toBeLessThanOrEqual(dijkstra.metrics.pathCost);
    expect(astar.metrics.queuedNodes).toBeLessThanOrEqual(dijkstra.metrics.queuedNodes);
  });
});
