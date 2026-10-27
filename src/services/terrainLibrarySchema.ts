import { z } from 'zod';
import { LIBRARY_LIMITS, type LibraryPiece } from '../domain/library';
import { TERRAIN_TYPES } from '../domain/terrain';

/** Bump when the shape of a saved piece changes, and teach the reader the old shape. */
export const PIECE_SCHEMA_VERSION = 1;

const side = z.number().min(LIBRARY_LIMITS.minSide).max(LIBRARY_LIMITS.maxSide);

/** A piece as it is stored in `users/{uid}/terrainPieces/{pieceId}`. Timestamps are not read. */
const pieceDocumentSchema = z.object({
  name: z.string().trim().min(1).max(LIBRARY_LIMITS.nameLength),
  type: z.enum(TERRAIN_TYPES),
  footprint: z.object({ kind: z.enum(['rect', 'ellipse']), width: side, depth: side }),
  quantity: z.int().min(LIBRARY_LIMITS.minQuantity).max(LIBRARY_LIMITS.maxQuantity),
  image: z.object({ version: z.int().min(1), ratio: z.number().positive() }).nullable(),
  schemaVersion: z.literal(PIECE_SCHEMA_VERSION),
});

export type PieceDocument = z.infer<typeof pieceDocumentSchema>;

export type ParsedPiece =
  | { readonly ok: true; readonly piece: LibraryPiece }
  | { readonly ok: false; readonly problem: string };

/** Checks a stored piece before it reaches the app. */
export function parsePieceDocument(id: string, data: unknown): ParsedPiece {
  const result = pieceDocumentSchema.safeParse(data);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    return {
      ok: false,
      problem: `A saved piece (${id}) could not be read and was left out. Check: ${fields.join(', ')}.`,
    };
  }
  const { name, type, footprint, quantity, image } = result.data;
  return { ok: true, piece: { id, name, type, footprint, quantity, image } };
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
