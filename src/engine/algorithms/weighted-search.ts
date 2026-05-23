import { getNeighbors, manhattanDistance, positionKey, reconstructPath, samePosition } from "../core/grid";
import { MinHeap } from "../core/min-heap";
import type {
  AlgorithmId,
  GridModel,
  GridPosition,
  Pathfinder,
  PathfinderEvent,
  PathfinderOptions,
  PathfinderResult
} from "../core/types";

type Heuristic = (position: GridPosition, target: GridPosition) => number;

interface WeightedSearchConfig {
  readonly id: AlgorithmId;
  readonly heuristic: Heuristic;
  readonly useWeights: boolean;
}

export class WeightedSearchPathfinder implements Pathfinder {
  readonly id: AlgorithmId;
  private readonly heuristic: Heuristic;
  private readonly useWeights: boolean;

  constructor(config: WeightedSearchConfig) {
    this.id = config.id;
    this.heuristic = config.heuristic;
    this.useWeights = config.useWeights;
  }

  run(grid: GridModel, options: PathfinderOptions = {}): PathfinderResult {
    const startedAt = performance.now();
    const frontier = new MinHeap<GridPosition>();
    const cameFrom = new Map<string, string>();
    const costSoFar = new Map<string, number>();
    const registry = new Map<string, GridPosition>();
    const events: PathfinderEvent[] = [];
    const maxIterations = options.maxIterations ?? grid.width * grid.height * 8;

    frontier.push(grid.start, 0);
    costSoFar.set(positionKey(grid.start), 0);
    registry.set(positionKey(grid.start), grid.start);

    let iterations = 0;
    let queuedNodes = 1;
    let reached = false;

    while (!frontier.isEmpty && iterations < maxIterations) {
      iterations += 1;
      const currentNode = frontier.pop();
      if (!currentNode) break;
      const current = currentNode.item;
      const currentKey = positionKey(current);
      const currentCost = costSoFar.get(currentKey) ?? Number.POSITIVE_INFINITY;

      events.push(this.event("visited", current, currentCost, iterations));
      if (samePosition(current, grid.target)) {
        reached = true;
        break;
      }

      for (const neighbor of getNeighbors(grid, current, options.allowDiagonal)) {
        const neighborKey = positionKey(neighbor);
        const stepCost = this.useWeights ? neighbor.weight : 1;
        const nextCost = currentCost + stepCost;
        const previousCost = costSoFar.get(neighborKey) ?? Number.POSITIVE_INFINITY;

        if (nextCost >= previousCost) {
          events.push(this.event("rejected", neighbor, previousCost, iterations));
          continue;
        }

        costSoFar.set(neighborKey, nextCost);
        cameFrom.set(neighborKey, currentKey);
        registry.set(neighborKey, neighbor);
        const priority = nextCost + this.heuristic(neighbor, grid.target);
        frontier.push(neighbor, priority);
        queuedNodes += 1;
        events.push(this.event("queued", neighbor, nextCost, iterations));
        events.push(this.event("relaxed", neighbor, priority, iterations));
      }
    }

    const path = reached ? reconstructPath(cameFrom, grid.target, registry) : [];
    for (const [depth, position] of path.entries()) {
      events.push(this.event("path", position, costSoFar.get(positionKey(position)) ?? depth, depth));
    }

    const durationMs = performance.now() - startedAt;
    const pathCost = path.length > 0 ? costSoFar.get(positionKey(grid.target)) ?? 0 : Number.POSITIVE_INFINITY;

    return {
      algorithm: this.id,
      path,
      events,
      reached,
      metrics: {
        algorithm: this.id,
        durationMs,
        visitedNodes: iterations,
        queuedNodes,
        pathCost,
        pathLength: path.length,
        memoryBytes: (cameFrom.size + costSoFar.size + registry.size) * 64
      }
    };
  }

  private event(type: PathfinderEvent["type"], position: GridPosition, cost: number, depth: number): PathfinderEvent {
    return {
      type,
      algorithm: this.id,
      position,
      cost,
      depth,
      timestamp: performance.now()
    };
  }
}

export const createAStarPathfinder = (): Pathfinder =>
  new WeightedSearchPathfinder({ id: "astar", heuristic: manhattanDistance, useWeights: true });

export const createDijkstraPathfinder = (): Pathfinder =>
  new WeightedSearchPathfinder({ id: "dijkstra", heuristic: () => 0, useWeights: true });

export const createGreedyPathfinder = (): Pathfinder =>
  new WeightedSearchPathfinder({ id: "greedy", heuristic: (position, target) => manhattanDistance(position, target) * 2, useWeights: false });
