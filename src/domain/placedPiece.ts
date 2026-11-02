import { polygonBounds, type Bounds, type Polygon } from './geometry';
import { placeFootprint, type Placement, type TerrainPiece } from './terrain';

/** A piece at its spot on the board, with the outline it covers there. */
export interface PlacedPiece {
  readonly piece: TerrainPiece;
  readonly placement: Placement;
  readonly polygon: Polygon;
  readonly bounds: Bounds;
}

/** Pieces placed together as one group; inside a group, pieces may stand joined. */
export type PlacedGroup = readonly PlacedPiece[];

export function placePiece(piece: TerrainPiece, placement: Placement): PlacedPiece {
  const polygon = placeFootprint(piece.footprint, placement);
  return { piece, placement, polygon, bounds: polygonBounds(polygon) };
}
