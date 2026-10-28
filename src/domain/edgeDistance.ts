import type { Board } from './board';
import { add, dot, rotate, type Point } from './geometry';
import { footprintPolygon, type Footprint, type Placement } from './terrain';

/**
 * A side of the board as drawn on a wide screen: x runs from the left edge to the right edge and
 * y from the top edge down to the bottom edge.
 */
export type BoardEdge = 'left' | 'right' | 'top' | 'bottom';

export const BOARD_EDGES: readonly BoardEdge[] = ['left', 'right', 'top', 'bottom'];

/** The straight gap between a board edge and the closest point of a piece, in inches. */
export interface EdgeGap {
  readonly edge: BoardEdge;
  readonly inches: number;
  /** The point of the piece that comes closest to the edge. */
  readonly from: Point;
  /** The point on the edge straight across from `from`. */
  readonly to: Point;
}

const OUTWARD: Readonly<Record<BoardEdge, Point>> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

/** Corners this close along a direction count as the same distance, so a flat side is measured at its middle. */
const TIE = 1e-6;

/** The gaps from a placed piece to all four edges, in the order of `BOARD_EDGES`. */
export function edgeGaps(footprint: Footprint, placement: Placement, board: Board): EdgeGap[] {
  return BOARD_EDGES.map((edge) => gapTo(edge, footprint, placement, board));
}

function gapTo(edge: BoardEdge, footprint: Footprint, placement: Placement, board: Board): EdgeGap {
  const from = farthestPoint(footprint, placement, OUTWARD[edge]);
  const to = pointOnEdge(edge, from, board);
  return { edge, inches: Math.abs(to.x - from.x) + Math.abs(to.y - from.y), from, to };
}

function pointOnEdge(edge: BoardEdge, p: Point, board: Board): Point {
  switch (edge) {
    case 'left':
      return { x: 0, y: p.y };
    case 'right':
      return { x: board.width, y: p.y };
    case 'top':
      return { x: p.x, y: 0 };
    case 'bottom':
      return { x: p.x, y: board.depth };
  }
}

/** The point of the placed piece that reaches farthest in `direction`, a unit vector. */
export function farthestPoint(footprint: Footprint, placement: Placement, direction: Point): Point {
  const local = rotate(direction, -placement.rotation);
  const reach =
    footprint.kind === 'ellipse'
      ? farthestOnEllipse(footprint.width / 2, footprint.depth / 2, local)
      : farthestCorner(footprintPolygon(footprint), local);
  return add(rotate(reach, placement.rotation), placement.position);
}

/** The exact point of an ellipse around the origin that reaches farthest in `direction`. */
function farthestOnEllipse(halfWidth: number, halfDepth: number, direction: Point): Point {
  const x = halfWidth * halfWidth * direction.x;
  const y = halfDepth * halfDepth * direction.y;
  const length = Math.sqrt(x * direction.x + y * direction.y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

/** The corner that reaches farthest in `direction`, or the middle of a side that faces it. */
function farthestCorner(corners: readonly Point[], direction: Point): Point {
  const best = Math.max(...corners.map((corner) => dot(corner, direction)));
  const tied = corners.filter((corner) => best - dot(corner, direction) < TIE);
  const sum = tied.reduce(add, { x: 0, y: 0 });
  return { x: sum.x / tied.length, y: sum.y / tied.length };
}

/** Whether the edge is one of the board's long sides. A square board counts top and bottom. */
export function isLongEdge(edge: BoardEdge, board: Board): boolean {
  const topAndBottomLong = board.width >= board.depth;
  return (edge === 'top' || edge === 'bottom') === topAndBottomLong;
}

/**
 * The two gaps that place a piece: to the closer long edge, then to the closer short edge. With
 * the piece's turn, these two fix where it stands.
 */
export function nearestGaps(gaps: readonly EdgeGap[], board: Board): [EdgeGap, EdgeGap] {
  const long = gaps.filter((gap) => isLongEdge(gap.edge, board));
  const short = gaps.filter((gap) => !isLongEdge(gap.edge, board));
  return [closest(long), closest(short)];
}

function closest(gaps: readonly EdgeGap[]): EdgeGap {
  const [first, ...rest] = gaps;
  if (first === undefined) {
    throw new Error('There are no gaps to choose from.');
  }
  return rest.reduce((best, gap) => (gap.inches < best.inches ? gap : best), first);
}

/**
 * How far the piece's width side is turned from the long edges, in whole degrees: positive is
 * clockwise as seen from above, in (-90, 90], or (-45, 45] for a square. Null for a round piece,
 * whose turn does not matter.
 */
export function turnFromLongEdge(
  footprint: Footprint,
  rotation: number,
  board: Board,
): number | null {
  const square = footprint.width === footprint.depth;
  if (square && footprint.kind === 'ellipse') {
    return null;
  }
  // Rotation turns the piece clockwise on the drawn board, whose y runs down.
  const longEdgeAngle = board.width >= board.depth ? 0 : 90;
  return foldAngle(Math.round(rotation - longEdgeAngle), square ? 90 : 180);
}

/** The angle in (-period / 2, period / 2]. */
function foldAngle(degrees: number, period: number): number {
  const folded = ((degrees % period) + period) % period;
  return folded > period / 2 ? folded - period : folded;
}
