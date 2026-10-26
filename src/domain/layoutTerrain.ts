import {
  placeFootprint,
  type PlacedTerrain,
  type Placement,
  type TerrainEffects,
  type TerrainPiece,
} from './terrain';

export function pieceById(collection: readonly TerrainPiece[], id: string): TerrainPiece {
  const piece = collection.find((candidate) => candidate.id === id);
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
  return placements.map((placement) => {
    const piece = pieceById(collection, placement.pieceId);
    return {
      pieceId: piece.id,
      polygon: placeFootprint(piece.footprint, placement),
      effect: effects[piece.type],
    };
  });
}
