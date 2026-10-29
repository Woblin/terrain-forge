import type { TerrainPiece } from './terrain';

function rect(
  id: string,
  name: string,
  type: TerrainPiece['type'],
  width: number,
  depth: number,
  quantity = 1,
): TerrainPiece {
  return { id, name, type, footprint: { kind: 'rect', width, depth }, quantity };
}

/**
 * The product owner's own Warhammer Fantasy terrain, read from their library on 28 October 2026
 * and updated on 29 October, with Stone Wall moved to the wall type. Generator tests and
 * benchmarks use it as real-world terrain. About 12% of a 72 x 48 board: five buildings, four
 * ruins, six walls and two forests.
 */
export const ROBIN_COLLECTION: readonly TerrainPiece[] = [
  rect('building-1', 'Building 1', 'building', 9.65, 9.65),
  rect('building-2', 'Building 2', 'building', 6.1, 3.39),
  rect('building-3', 'Building 3', 'building', 6.1, 4.13),
  rect('building-4', 'Building 4', 'building', 5.91, 4.72),
  rect('building-5', 'Building 5', 'building', 5.71, 3.74),
  rect('ruin-1', 'Ruin 1', 'ruin', 7.48, 5.91),
  rect('ruin-2', 'Ruin 2', 'ruin', 6.69, 7.48),
  rect('ruin-3', 'Ruin 3', 'ruin', 6.1, 4.33),
  rect('ruin-4', 'Ruin 4', 'ruin', 4.53, 4.72),
  rect('stone-wall', 'Stone Wall', 'wall', 5.12, 0.59, 6),
  {
    id: 'forest',
    name: 'Forest',
    type: 'forest',
    footprint: { kind: 'ellipse', width: 7.87, depth: 5.91 },
    quantity: 2,
  },
];
