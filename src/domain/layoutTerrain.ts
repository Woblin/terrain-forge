import { findById } from './findById';
import type { Polygon } from './geometry';
import {
  placeFootprint,
  type PlacedTerrain,
  type Placement,
  type TerrainEffects,
  type TerrainPiece,
} from './terrain';

/** The piece with this id, where a missing piece is a mistake in the program. */
export function pieceById(collection: readonly TerrainPiece[], id: string): TerrainPiece {
  return requirePiece(findById(collection, id), id);
}

/**
 * Looks up pieces of the collection by id, for many lookups in a row. A missing piece is a mistake
 * in the program.
 */
export function pieceFinder(collection: readonly TerrainPiece[]): (id: string) => TerrainPiece {
  const byId = new Map<string, TerrainPiece>();
  for (const piece of collection) {
    // The first piece with an id wins, as with `findById`.
    if (!byId.has(piece.id)) {
      byId.set(piece.id, piece);
    }
  }
  return (id) => requirePiece(byId.get(id), id);
}

function requirePiece(piece: TerrainPiece | undefined, id: string): TerrainPiece {
  if (piece === undefined) {
    throw new Error(`Terrain piece "${id}" is not in the collection.`);
  }
  return piece;
}

/** The terrain the fairness rules measure, for placements of pieces from a collection. */
export function layoutTerrain(
  placements: readonly Placement[],
  collection: readonly TerrainPiece[],
  effects: TerrainEffects,
): PlacedTerrain[] {
  const pieceOf = pieceFinder(collection);
  return placements.map((placement) => {
    const piece = pieceOf(placement.pieceId);
    return placedTerrainOf(piece, placeFootprint(piece.footprint, placement), effects);
  });
}

/** What the fairness rules measure of one piece that covers `polygon`. */
export function placedTerrainOf(
  piece: TerrainPiece,
  polygon: Polygon,
  effects: TerrainEffects,
): PlacedTerrain {
  return { pieceId: piece.id, polygon, effect: effects[piece.type] };
}
