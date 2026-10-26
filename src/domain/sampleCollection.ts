import type { TerrainPiece } from './terrain';

/**
 * A built-in collection to generate and edit boards with until each player has their own
 * library. About 39% of a 60 x 44 board, with something of every kind.
 */
export const SAMPLE_COLLECTION: readonly TerrainPiece[] = [
  {
    id: 'ruin-large',
    name: 'Large ruin',
    type: 'ruin',
    footprint: { kind: 'rect', width: 12, depth: 6 },
    quantity: 6,
  },
  {
    id: 'ruin-small',
    name: 'Small ruin',
    type: 'ruin',
    footprint: { kind: 'rect', width: 8, depth: 5 },
    quantity: 6,
  },
  {
    id: 'forest',
    name: 'Forest',
    type: 'forest',
    footprint: { kind: 'ellipse', width: 9, depth: 7 },
    quantity: 2,
  },
  {
    id: 'barricade',
    name: 'Barricade',
    type: 'obstacle',
    footprint: { kind: 'rect', width: 6, depth: 1 },
    quantity: 4,
  },
  {
    id: 'crater',
    name: 'Crater',
    type: 'crater',
    footprint: { kind: 'ellipse', width: 5, depth: 5 },
    quantity: 2,
  },
  {
    id: 'building',
    name: 'Building',
    type: 'building',
    footprint: { kind: 'rect', width: 10, depth: 10 },
    quantity: 2,
  },
];
