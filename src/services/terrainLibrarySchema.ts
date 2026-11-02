import { z } from 'zod';
import { LIBRARY_LIMITS, type LibraryPiece } from '../domain/library';
import { FOOTPRINT_KINDS, TERRAIN_TYPES } from '../domain/terrain';
import type { Parsed } from './firestoreStore';
import { NEWER_VERSION_PROBLEM, schemaFor } from './schemaVersion';

/** Bump when the shape of a saved piece changes, and teach the reader the old shape. */
export const PIECE_SCHEMA_VERSION = 1;

const side = z.number().min(LIBRARY_LIMITS.minSide).max(LIBRARY_LIMITS.maxSide);

/** A piece as it is stored in `users/{uid}/terrainPieces/{pieceId}`. Timestamps are not read. */
/** What a piece is, as a library stores it and as a saved board keeps a copy of it. */
export const pieceFieldsSchema = z.object({
  name: z.string().trim().min(1).max(LIBRARY_LIMITS.nameLength),
  type: z.enum(TERRAIN_TYPES),
  footprint: z.object({ kind: z.enum(FOOTPRINT_KINDS), width: side, depth: side }),
  quantity: z.int().min(LIBRARY_LIMITS.minQuantity).max(LIBRARY_LIMITS.maxQuantity),
});

const pieceDocumentSchema = pieceFieldsSchema.extend({
  image: z.object({ version: z.int().min(1), ratio: z.number().positive() }).nullable(),
  schemaVersion: z.literal(PIECE_SCHEMA_VERSION),
});

export type PieceDocument = z.infer<typeof pieceDocumentSchema>;

/** The schema for each version a piece has been saved with. */
const readers = { [PIECE_SCHEMA_VERSION]: pieceDocumentSchema };

/** Checks a stored piece before it reaches the app. */
export function parsePieceDocument(id: string, data: unknown): Parsed<LibraryPiece> {
  const reader = schemaFor(data, readers, PIECE_SCHEMA_VERSION);
  if (reader.newer) {
    return { ok: false, problem: `A saved piece (${id}) ${NEWER_VERSION_PROBLEM}` };
  }
  const result = reader.schema.safeParse(data);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    return {
      ok: false,
      problem: `A saved piece (${id}) could not be read and was left out. Check: ${fields.join(', ')}.`,
    };
  }
  const { name, type, footprint, quantity, image } = result.data;
  return { ok: true, value: { id, name, type, footprint, quantity, image } };
}

/** The fields written for a piece, without its id (the document id) or timestamps. */
export function pieceDocument(piece: LibraryPiece): PieceDocument {
  return {
    name: piece.name,
    type: piece.type,
    footprint: { ...piece.footprint },
    quantity: piece.quantity,
    image: piece.image === null ? null : { ...piece.image },
    schemaVersion: PIECE_SCHEMA_VERSION,
  };
}
