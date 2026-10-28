import type { Board, DeploymentMap } from './board';
import { containsPoint, distanceToPolygon, type Point } from './geometry';
import type { PlacedPiece } from './placement';
import { isOpenTerrain, type SpacingRules } from './spacing';

/** What a ranked unit needs to march across the board. */
export interface ClearanceRules {
  /** Frontage of the widest unit, in inches. */
  readonly width: number;
  /** Share of the open midfield that unit must be able to reach. */
  readonly minReach: number;
}

export interface Clearance {
  /** Whether the unit can march from Player A's zone into Player B's. */
  readonly connected: boolean;
  /** Share of the midfield with room for the unit that it can reach from Player A's zone. */
  readonly reach: number;
}

export interface ClearanceInput {
  readonly board: Board;
  readonly deployment: DeploymentMap;
  readonly pieces: readonly PlacedPiece[];
  readonly spacing: SpacingRules;
  readonly rules: ClearanceRules;
}

/** The board is checked on a grid this fine, so the check is accurate to about this much. */
export const CLEARANCE_CELL = 0.5;

type Area = 'A' | 'B' | 'mid';

interface Cell {
  readonly centre: Point;
  readonly area: Area;
  readonly free: boolean;
}

/**
 * Whether a unit as wide as the widest regiment can march between the terrain. Terrain units move
 * over, such as hills, does not count. Every other outline grows by half the unit's width, and a
 * flood from Player A's zone over what is left shows where the unit's centre can go.
 */
export function regimentClearance(input: ClearanceInput): Clearance {
  const columns = Math.floor(input.board.width / CLEARANCE_CELL);
  const rows = Math.floor(input.board.depth / CLEARANCE_CELL);
  const cells = gridCells(input, columns, rows);
  const reached = flood(cells, columns, rows);
  const midfield = cells.filter((cell) => cell.area === 'mid' && cell.free);
  const reachedMid = cells.filter((cell, i) => cell.area === 'mid' && reached[i]).length;
  return {
    connected: cells.some((cell, i) => cell.area === 'B' && reached[i]),
    reach: midfield.length === 0 ? 1 : reachedMid / midfield.length,
  };
}

export function isPassable(clearance: Clearance, rules: ClearanceRules): boolean {
  return clearance.connected && clearance.reach >= rules.minReach;
}

function gridCells(input: ClearanceInput, columns: number, rows: number): Cell[] {
  const { board, deployment, spacing } = input;
  // The grid can miss the middle of a gap by up to half a cell, so the unit gets that much slack.
  const radius = input.rules.width / 2 - CLEARANCE_CELL / 2;
  const blockers = input.pieces.filter((piece) => !isOpenTerrain(piece.piece, spacing));
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const centre = { x: (column + 0.5) * CLEARANCE_CELL, y: (row + 0.5) * CLEARANCE_CELL };
      cells.push({
        centre,
        area: areaOf(centre, deployment),
        free: onTable(centre, board, radius) && clearOf(centre, blockers, radius),
      });
    }
  }
  return cells;
}

function areaOf(point: Point, deployment: DeploymentMap): Area {
  if (containsPoint(deployment.zones.A, point)) {
    return 'A';
  }
  return containsPoint(deployment.zones.B, point) ? 'B' : 'mid';
}

function onTable(point: Point, board: Board, radius: number): boolean {
  return (
    point.x >= radius &&
    point.y >= radius &&
    board.width - point.x >= radius &&
    board.depth - point.y >= radius
  );
}

function clearOf(point: Point, blockers: readonly PlacedPiece[], radius: number): boolean {
  return blockers.every(
    ({ bounds, polygon }) =>
      point.x < bounds.minX - radius ||
      point.x > bounds.maxX + radius ||
      point.y < bounds.minY - radius ||
      point.y > bounds.maxY + radius ||
      distanceToPolygon(point, polygon) >= radius,
  );
}

/** Which free cells can be reached from the free cells in Player A's zone, moving to any of eight neighbours. */
function flood(cells: readonly Cell[], columns: number, rows: number): boolean[] {
  const reached = cells.map(() => false);
  const queue: number[] = [];
  cells.forEach((cell, i) => {
    if (cell.free && cell.area === 'A') {
      reached[i] = true;
      queue.push(i);
    }
  });
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    for (const neighbour of neighbours(next, columns, rows)) {
      if (!reached[neighbour] && cells[neighbour]?.free === true) {
        reached[neighbour] = true;
        queue.push(neighbour);
      }
    }
  }
  return reached;
}

function neighbours(index: number, columns: number, rows: number): number[] {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = column + dx;
      const y = row + dy;
      if ((dx !== 0 || dy !== 0) && x >= 0 && x < columns && y >= 0 && y < rows) {
        result.push(y * columns + x);
      }
    }
  }
  return result;
}
