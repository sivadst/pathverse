import { getNeighbors, positionKey, reconstructPath, samePosition } from "../core/grid";
import { RingQueue } from "../core/queue";
import type {
  AlgorithmId,
  GridModel,
  GridPosition,
  Pathfinder,
  PathfinderEvent,
  PathfinderOptions,
  PathfinderResult
} from "../core/types";

type FrontierMode = "queue" | "stack";

export class UnweightedPathfinder implements Pathfinder {
  readonly id: AlgorithmId;
  private readonly mode: FrontierMode;

  constructor(id: AlgorithmId, mode: FrontierMode) {
    this.id = id;
    this.mode = mode;
  }

  run(grid: GridModel, options: PathfinderOptions = {}): PathfinderResult {
    const startedAt = performance.now();
    const queue = new RingQueue<GridPosition>(grid.width * grid.height);
    const stack: GridPosition[] = [];
    const visited = new Set<string>();
    const cameFrom = new Map<string, string>();
    const registry = new Map<string, GridPosition>();
    const events: PathfinderEvent[] = [];
    const maxIterations = options.maxIterations ?? grid.width * grid.height * 8;

    this.push(queue, stack, grid.start);
    visited.add(positionKey(grid.start));
    registry.set(positionKey(grid.start), grid.start);

    let iterations = 0;
    let queuedNodes = 1;
    let reached = false;

    while ((queue.size > 0 || stack.length > 0) && iterations < maxIterations) {
      iterations += 1;
      const current = this.pop(queue, stack);
      if (!current) break;

      events.push(this.event("visited", current, iterations, iterations));
      if (samePosition(current, grid.target)) {
        reached = true;
        break;
      }

      for (const neighbor of getNeighbors(grid, current, options.allowDiagonal)) {
        const key = positionKey(neighbor);
        if (visited.has(key)) continue;

        visited.add(key);
        cameFrom.set(key, positionKey(current));
        registry.set(key, neighbor);
        this.push(queue, stack, neighbor);
        queuedNodes += 1;
        events.push(this.event("queued", neighbor, queuedNodes, iterations));
        events.push(this.event("frontier", neighbor, queuedNodes, iterations));
      }
    }

    const path = reached ? reconstructPath(cameFrom, grid.target, registry) : [];
    for (const [depth, position] of path.entries()) {
      events.push(this.event("path", position, depth, depth));
    }

    return {
      algorithm: this.id,
      path,
      events,
      reached,
      metrics: {
        algorithm: this.id,
        durationMs: performance.now() - startedAt,
        visitedNodes: iterations,
        queuedNodes,
        pathCost: path.length > 0 ? path.length - 1 : Number.POSITIVE_INFINITY,
        pathLength: path.length,
        memoryBytes: (visited.size + cameFrom.size + registry.size) * 48
      }
    };
  }

  private push(queue: RingQueue<GridPosition>, stack: GridPosition[], position: GridPosition): void {
    if (this.mode === "queue") {
      queue.enqueue(position);
    } else {
      stack.push(position);
    }
  }

  private pop(queue: RingQueue<GridPosition>, stack: GridPosition[]): GridPosition | undefined {
    return this.mode === "queue" ? queue.dequeue() : stack.pop();
  }

  private event(type: PathfinderEvent["type"], position: GridPosition, cost: number, depth: number): PathfinderEvent {
    return { type, algorithm: this.id, position, cost, depth, timestamp: performance.now() };
  }
}

export const createBfsPathfinder = (): Pathfinder => new UnweightedPathfinder("bfs", "queue");
export const createDfsPathfinder = (): Pathfinder => new UnweightedPathfinder("dfs", "stack");
