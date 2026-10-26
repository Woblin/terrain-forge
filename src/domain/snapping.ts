import type { Board } from './board';
import type { Bounds, Point } from './geometry';
import { toInches, type LengthUnit } from './units';

/** Rotation snaps to the generator's own step. */
export const ROTATION_STEP = 15;
/** A piece edge this close to the edge margin is pulled onto it. */
export const EDGE_SNAP_REACH = 0.5;

/** The angle in [0, 360). */
export function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function snapRotation(degrees: number, step = ROTATION_STEP): number {
  return normalizeRotation(Math.round(degrees / step) * step);
}

/** The position grid in inches: half an inch, or one centimetre when the player uses cm. */
export function gridStep(unit: LengthUnit): number {
  return unit === 'in' ? 0.5 : toInches(1, 'cm');
}

export function snapToGrid(p: Point, step: number): Point {
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step };
}

/**
 * Moves a piece so its edge lies exactly on the edge margin when it comes within `reach` of it,
 * on either side and in both directions. `bounds` are the piece's bounds at `position`.
 */
export function snapToEdgeMargin(
  position: Point,
  bounds: Bounds,
  board: Board,
  edgeMargin: number,
  reach = EDGE_SNAP_REACH,
): Point {
  const dx = edgeShift(bounds.minX, bounds.maxX, board.width, edgeMargin, reach);
  const dy = edgeShift(bounds.minY, bounds.maxY, board.depth, edgeMargin, reach);
  return { x: position.x + dx, y: position.y + dy };
}

function edgeShift(
  min: number,
  max: number,
  size: number,
  edgeMargin: number,
  reach: number,
): number {
  const far = size - edgeMargin;
  if (Math.abs(min - edgeMargin) <= reach) {
    return edgeMargin - min;
  }
  if (Math.abs(max - far) <= reach) {
    return far - max;
  }
  return 0;
}
