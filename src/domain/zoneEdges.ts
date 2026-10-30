import type { Board } from './board';
import { edges, type Point, type Polygon } from './geometry';

/** How far a point may be from a board edge and still count as on it, in inches. */
const ON_EDGE = 1e-6;

/** The sides of a deployment zone that face into the board, leaving out those on its edge. */
export function innerEdges(zone: Polygon, board: Board): [Point, Point][] {
  return edges(zone).filter(([a, b]) => !onSameBoardEdge(a, b, board));
}

function onSameBoardEdge(a: Point, b: Point, board: Board): boolean {
  const near = (value: number, line: number) => Math.abs(value - line) < ON_EDGE;
  return (
    (near(a.x, 0) && near(b.x, 0)) ||
    (near(a.x, board.width) && near(b.x, board.width)) ||
    (near(a.y, 0) && near(b.y, 0)) ||
    (near(a.y, board.depth) && near(b.y, board.depth))
  );
}
