import type { AlgorithmId, Pathfinder } from "../core/types";
import { createBidirectionalPathfinder } from "./bidirectional";
import { createBfsPathfinder, createDfsPathfinder } from "./unweighted-search";
import { createAStarPathfinder, createDijkstraPathfinder, createGreedyPathfinder } from "./weighted-search";

export const createPathfinder = (algorithm: AlgorithmId): Pathfinder => {
  switch (algorithm) {
    case "astar":
      return createAStarPathfinder();
    case "dijkstra":
      return createDijkstraPathfinder();
    case "bfs":
      return createBfsPathfinder();
    case "dfs":
      return createDfsPathfinder();
    case "greedy":
      return createGreedyPathfinder();
    case "bidirectional":
      return createBidirectionalPathfinder();
  }
};

export const runPathfinder = (algorithm: AlgorithmId, ...args: Parameters<Pathfinder["run"]>) =>
  createPathfinder(algorithm).run(...args);

export const PATHFINDERS: readonly AlgorithmId[] = ["astar", "dijkstra", "bfs", "dfs", "greedy", "bidirectional"];
