import { counterClockwise, rectangle, type Point, type Polygon } from './geometry';

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
