import { getNeighbors, positionKey, samePosition } from "../core/grid";
import { RingQueue } from "../core/queue";
import type { GridModel, GridPosition, Pathfinder, PathfinderEvent, PathfinderOptions, PathfinderResult } from "../core/types";

const buildHalf = (
  cameFrom: ReadonlyMap<string, string>,
  registry: ReadonlyMap<string, GridPosition>,
  startKey: string,
  meetingKey: string
): GridPosition[] => {
  const half: GridPosition[] = [];
  let cursor = meetingKey;
  while (cursor !== startKey) {
    const position = registry.get(cursor);
    if (!position) break;
    half.push(position);
    const parent = cameFrom.get(cursor);
    if (!parent) break;
    cursor = parent;
  }
  const start = registry.get(startKey);
  if (start) half.push(start);
  return half.reverse();
};

export class BidirectionalPathfinder implements Pathfinder {
  readonly id = "bidirectional" as const;

  run(grid: GridModel, options: PathfinderOptions = {}): PathfinderResult {
    const startedAt = performance.now();
    const forwardQueue = new RingQueue<GridPosition>();
    const backwardQueue = new RingQueue<GridPosition>();
    const forwardVisited = new Set<string>([positionKey(grid.start)]);
    const backwardVisited = new Set<string>([positionKey(grid.target)]);
    const forwardParent = new Map<string, string>();
    const backwardParent = new Map<string, string>();
    const registry = new Map<string, GridPosition>([
      [positionKey(grid.start), grid.start],
      [positionKey(grid.target), grid.target]
    ]);
    const events: PathfinderEvent[] = [];
    const maxIterations = options.maxIterations ?? grid.width * grid.height * 8;

    forwardQueue.enqueue(grid.start);
    backwardQueue.enqueue(grid.target);

    let meetingKey: string | undefined;
    let iterations = 0;

    while (forwardQueue.size > 0 && backwardQueue.size > 0 && iterations < maxIterations && !meetingKey) {
      iterations += 1;
      meetingKey = this.expand(grid, forwardQueue, forwardVisited, backwardVisited, forwardParent, registry, events, options, iterations);
      if (meetingKey) break;
      meetingKey = this.expand(grid, backwardQueue, backwardVisited, forwardVisited, backwardParent, registry, events, options, iterations);
    }

    const path = meetingKey
      ? [
          ...buildHalf(forwardParent, registry, positionKey(grid.start), meetingKey),
          ...buildHalf(backwardParent, registry, positionKey(grid.target), meetingKey).reverse().slice(1)
        ]
      : [];

    for (const [depth, position] of path.entries()) {
      events.push(this.event("path", position, depth, depth));
    }

    return {
      algorithm: this.id,
      path,
      events,
      reached: Boolean(meetingKey),
      metrics: {
        algorithm: this.id,
        durationMs: performance.now() - startedAt,
        visitedNodes: forwardVisited.size + backwardVisited.size,
        queuedNodes: forwardVisited.size + backwardVisited.size,
        pathCost: path.length > 0 ? path.length - 1 : Number.POSITIVE_INFINITY,
        pathLength: path.length,
        memoryBytes: (forwardVisited.size + backwardVisited.size + forwardParent.size + backwardParent.size) * 52
      }
    };
  }

  private expand(
    grid: GridModel,
    queue: RingQueue<GridPosition>,
    ownVisited: Set<string>,
    otherVisited: ReadonlySet<string>,
    parentMap: Map<string, string>,
    registry: Map<string, GridPosition>,
    events: PathfinderEvent[],
    options: PathfinderOptions,
    depth: number
  ): string | undefined {
    const current = queue.dequeue();
    if (!current) return undefined;
    events.push(this.event("visited", current, depth, depth));

    for (const neighbor of getNeighbors(grid, current, options.allowDiagonal)) {
      const key = positionKey(neighbor);
      if (ownVisited.has(key)) continue;
      ownVisited.add(key);
      parentMap.set(key, positionKey(current));
      registry.set(key, neighbor);
      queue.enqueue(neighbor);
      events.push(this.event("queued", neighbor, depth, depth));
      if (otherVisited.has(key) || samePosition(neighbor, grid.target) || samePosition(neighbor, grid.start)) {
        return key;
      }
    }
    return undefined;
  }

  private event(type: PathfinderEvent["type"], position: GridPosition, cost: number, depth: number): PathfinderEvent {
    return { type, algorithm: this.id, position, cost, depth, timestamp: performance.now() };
  }
}

export const createBidirectionalPathfinder = (): Pathfinder => new BidirectionalPathfinder();
