import {
  add,
  centroid,
  clipToHalfPlane,
  counterClockwise,
  dot,
  edges,
  rectangle,
  scale,
  subtract,
  type Point,
  type Polygon,
} from './geometry';

/** Board size in inches; x runs along the width and y along the depth. */
export interface Board {
  readonly width: number;
  readonly depth: number;
}

export type PlayerId = 'A' | 'B';

export const PLAYERS: readonly PlayerId[] = ['A', 'B'];

export interface DeploymentMap {
  readonly id: string;
  readonly name: string;
  readonly zones: Readonly<Record<PlayerId, Polygon>>;
}

export function boardPolygon(board: Board): Polygon {
  return rectangle(0, 0, board.width, board.depth);
}

export function boardArea(board: Board): number {
  return board.width * board.depth;
}

export function boardCentre(board: Board): Point {
  return { x: board.width / 2, y: board.depth / 2 };
}

/** The point opposite `p` through the board centre. */
export function mirrorPoint(p: Point, board: Board): Point {
  return { x: board.width - p.x, y: board.depth - p.y };
}

export function longEdgeDeployment(board: Board, zoneDepth: number): DeploymentMap {
  const { width, depth } = board;
  const alongWidth = width >= depth;
  return {
    id: 'long-edges',
    name: 'Long edges',
    zones: alongWidth
      ? { A: rectangle(0, 0, width, zoneDepth), B: rectangle(0, depth - zoneDepth, width, depth) }
      : { A: rectangle(0, 0, zoneDepth, depth), B: rectangle(width - zoneDepth, 0, width, depth) },
  };
}

export function shortEdgeDeployment(board: Board, zoneDepth: number): DeploymentMap {
  const { width, depth } = board;
  const alongWidth = width >= depth;
  return {
    id: 'short-edges',
    name: 'Short edges',
    zones: alongWidth
      ? { A: rectangle(0, 0, zoneDepth, depth), B: rectangle(width - zoneDepth, 0, width, depth) }
      : { A: rectangle(0, 0, width, zoneDepth), B: rectangle(0, depth - zoneDepth, width, depth) },
  };
}

/** Triangles in opposite corners, each reaching halfway along both edges. */
export function oppositeCornersDeployment(board: Board): DeploymentMap {
  const { width, depth } = board;
  const cornerA: Polygon = [
    { x: 0, y: 0 },
    { x: width / 2, y: 0 },
    { x: 0, y: depth / 2 },
  ];
  return {
    id: 'opposite-corners',
    name: 'Opposite corners',
    zones: {
      A: counterClockwise(cornerA),
      B: counterClockwise(cornerA.map((corner) => mirrorPoint(corner, board))),
    },
  };
}

export function standardDeployments(board: Board, zoneDepth: number): DeploymentMap[] {
  return [
    longEdgeDeployment(board, zoneDepth),
    shortEdgeDeployment(board, zoneDepth),
    oppositeCornersDeployment(board),
  ];
}

/**
 * The back of each zone: the part along its player's own table edge, `share` of the zone's depth
 * deep. Depth runs from the side of the zone that faces the rest of the table.
 */
export function zoneBacks(
  deployment: DeploymentMap,
  board: Board,
  share: number,
): Readonly<Record<PlayerId, Polygon>> {
  return {
    A: zoneBack(deployment.zones.A, board, share),
    B: zoneBack(deployment.zones.B, board, share),
  };
}

function zoneBack(zone: Polygon, board: Board, share: number): Polygon {
  return frontSides(zone, board).reduce((back, [a, b]) => {
    const inward = inwardNormal(zone, a, b);
    const depth = Math.max(...zone.map((corner) => dot(subtract(corner, a), inward)));
    return clipToHalfPlane(back, add(a, scale(inward, (1 - share) * depth)), inward);
  }, zone);
}

/** The sides of the zone that face the rest of the table rather than lie on a table edge. */
function frontSides(zone: Polygon, board: Board): [Point, Point][] {
  return edges(zone).filter(([a, b]) => !onOneTableEdge(a, b, board));
}

function onOneTableEdge(a: Point, b: Point, board: Board): boolean {
  const at = (value: number, edge: number): boolean => Math.abs(value - edge) < 1e-9;
  return (
    (at(a.x, 0) && at(b.x, 0)) ||
    (at(a.x, board.width) && at(b.x, board.width)) ||
    (at(a.y, 0) && at(b.y, 0)) ||
    (at(a.y, board.depth) && at(b.y, board.depth))
  );
}

/** The unit normal of side a to b that points into the zone. */
function inwardNormal(zone: Polygon, a: Point, b: Point): Point {
  const side = subtract(b, a);
  const length = Math.hypot(side.x, side.y);
  const normal = { x: -side.y / length, y: side.x / length };
  return dot(subtract(centroid(zone), a), normal) >= 0 ? normal : scale(normal, -1);
}
