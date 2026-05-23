import type { GridCell, GridModel, GridPosition } from "./types";

export const positionKey = (position: GridPosition): string => `${position.x}:${position.y}`;

export const samePosition = (a: GridPosition, b: GridPosition): boolean => a.x === b.x && a.y === b.y;

export const manhattanDistance = (a: GridPosition, b: GridPosition): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const euclideanDistance = (a: GridPosition, b: GridPosition): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const createGrid = (
  width: number,
  height: number,
  start: GridPosition,
  target: GridPosition,
  walls: readonly GridPosition[] = [],
  weighted: readonly (GridPosition & { weight: number })[] = []
): GridModel => {
  const wallSet = new Set(walls.map(positionKey));
  const weightMap = new Map(weighted.map((cell) => [positionKey(cell), cell.weight]));

  const cells: GridCell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const position = { x, y };
      const key = positionKey(position);
      const weight = weightMap.get(key) ?? 1;
      const kind = samePosition(position, start)
        ? "start"
        : samePosition(position, target)
          ? "target"
          : wallSet.has(key)
            ? "wall"
            : weight > 1
              ? "weight"
              : "empty";
      cells.push({ x, y, kind, weight });
    }
  }

  return { width, height, cells, start, target };
};

export const getCell = (grid: GridModel, position: GridPosition): GridCell | undefined => {
  if (position.x < 0 || position.y < 0 || position.x >= grid.width || position.y >= grid.height) {
    return undefined;
  }
  return grid.cells[position.y * grid.width + position.x];
};

export const getNeighbors = (
  grid: GridModel,
  position: GridPosition,
  allowDiagonal = false
): readonly GridCell[] => {
  const cardinal: GridPosition[] = [
    { x: position.x + 1, y: position.y },
    { x: position.x - 1, y: position.y },
    { x: position.x, y: position.y + 1 },
    { x: position.x, y: position.y - 1 }
  ];
  const diagonal: GridPosition[] = allowDiagonal
    ? [
        { x: position.x + 1, y: position.y + 1 },
        { x: position.x - 1, y: position.y + 1 },
        { x: position.x + 1, y: position.y - 1 },
        { x: position.x - 1, y: position.y - 1 }
      ]
    : [];

  return [...cardinal, ...diagonal]
    .map((neighbor) => getCell(grid, neighbor))
    .filter((cell): cell is GridCell => cell !== undefined && cell.kind !== "wall");
};

export const reconstructPath = (
  cameFrom: ReadonlyMap<string, string>,
  end: GridPosition,
  registry: ReadonlyMap<string, GridPosition>
): readonly GridPosition[] => {
  const path: GridPosition[] = [end];
  let cursor = positionKey(end);
  while (cameFrom.has(cursor)) {
    const parent = cameFrom.get(cursor);
    if (!parent) break;
    const parentPosition = registry.get(parent);
    if (!parentPosition) break;
    path.push(parentPosition);
    cursor = parent;
  }
  return path.reverse();
};
