import { placePolygon, rectangle, type Point, type Polygon } from './geometry';

export const TERRAIN_TYPES = [
  'ruin',
  'building',
  'forest',
  'obstacle',
  'wall',
  'hill',
  'crater',
] as const;

export type TerrainType = (typeof TERRAIN_TYPES)[number];

export const TERRAIN_TYPE_NAMES: Readonly<Record<TerrainType, string>> = {
  ruin: 'Ruin',
  building: 'Building',
  forest: 'Forest',
  obstacle: 'Obstacle',
  wall: 'Wall',
  hill: 'Hill',
  crater: 'Crater',
};

/** Size of a piece in inches, centred on the piece's own origin before rotation. */
export type Footprint =
  | { readonly kind: 'rect'; readonly width: number; readonly depth: number }
  | { readonly kind: 'ellipse'; readonly width: number; readonly depth: number };

/** One entry in a user's terrain collection. */
export interface TerrainPiece {
  readonly id: string;
  readonly name: string;
  readonly type: TerrainType;
  readonly footprint: Footprint;
  readonly quantity: number;
}

export type LineOfSightEffect = 'blocks' | 'obscures' | 'none';

export type CoverValue = 'none' | 'light' | 'heavy';

export interface TerrainEffect {
  readonly los: LineOfSightEffect;
  readonly cover: CoverValue;
}

export type TerrainEffects = Readonly<Record<TerrainType, TerrainEffect>>;

/** Where one piece stands: its centre in inches and its rotation in degrees counter-clockwise. */
export interface Placement {
  readonly pieceId: string;
  readonly position: Point;
  readonly rotation: number;
}

/** A placed piece with what the fairness rules need to know about it. */
export interface PlacedTerrain {
  readonly pieceId: string;
  readonly polygon: Polygon;
  readonly effect: TerrainEffect;
}

const ELLIPSE_SIDES = 16;

export function footprintPolygon(footprint: Footprint): Polygon {
  const halfWidth = footprint.width / 2;
  const halfDepth = footprint.depth / 2;
  if (footprint.kind === 'rect') {
    return rectangle(-halfWidth, -halfDepth, halfWidth, halfDepth);
  }
  return Array.from({ length: ELLIPSE_SIDES }, (_, i) => {
    const angle = (2 * Math.PI * i) / ELLIPSE_SIDES;
    return { x: halfWidth * Math.cos(angle), y: halfDepth * Math.sin(angle) };
  });
}

export function footprintArea(footprint: Footprint): number {
  const rectArea = footprint.width * footprint.depth;
  return footprint.kind === 'rect' ? rectArea : (Math.PI * rectArea) / 4;
}

export function placeFootprint(footprint: Footprint, placement: Placement): Polygon {
  return placePolygon(footprintPolygon(footprint), placement.position, placement.rotation);
}
