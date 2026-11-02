import { z } from 'zod';
import { RULE_IDS } from '../domain/fairness';
import { LIBRARY_LIMITS } from '../domain/library';
import { matIdOf } from '../domain/mats';
import { SAVED_BOARD_LIMITS, type SavedBoard, type SavedBoardContent } from '../domain/savedBoard';
import { STORED_ID_LENGTH } from '../domain/storageLimits';
import type { Parsed } from './firestoreStore';
import { NEWER_VERSION_PROBLEM, schemaFor } from './schemaVersion';
import { pieceFieldsSchema } from './terrainLibrarySchema';

/** Bump when the shape of a saved board changes, and teach the reader the old shape. */
export const BOARD_SCHEMA_VERSION = 1;

const id = z.string().min(1).max(STORED_ID_LENGTH);
const pieceId = z.string().min(1).max(LIBRARY_LIMITS.idLength);
const side = z.number().positive().max(SAVED_BOARD_LIMITS.maxSide);

const pieceSchema = pieceFieldsSchema.extend({ id: pieceId });

const placementSchema = z.object({
  pieceId,
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
});

/** A board as it is stored in `users/{uid}/boards/{boardId}`. Timestamps are read apart. */
const boardDocumentSchema = z.object({
  name: z.string().trim().min(1).max(SAVED_BOARD_LIMITS.nameLength),
  presetId: id,
  deploymentId: id,
  board: z.object({ width: side, depth: side }),
  seed: z.int().min(0),
  generatorVersion: z.int().min(1),
  enabledRules: z.array(z.enum(RULE_IDS)).max(RULE_IDS.length),
  pieces: z.array(pieceSchema).max(SAVED_BOARD_LIMITS.maxKinds),
  placements: z.array(placementSchema).max(SAVED_BOARD_LIMITS.maxPlacements),
  edited: z.boolean(),
  passed: z.boolean(),
  /** Missing on boards saved before mats; a mat this version does not know shows as plain. */
  matId: id.optional(),
  schemaVersion: z.literal(BOARD_SCHEMA_VERSION),
});

export type BoardDocument = z.infer<typeof boardDocumentSchema>;

/** The schema for each version a board has been saved with. */
const readers = { [BOARD_SCHEMA_VERSION]: boardDocumentSchema };

/** Checks a stored board before it reaches the app. */
export function parseBoardDocument(
  boardId: string,
  data: unknown,
  savedAt: number,
): Parsed<SavedBoard> {
  const reader = schemaFor(data, readers, BOARD_SCHEMA_VERSION);
  if (reader.newer) {
    return { ok: false, problem: `A saved board (${boardId}) ${NEWER_VERSION_PROBLEM}` };
  }
  const result = reader.schema.safeParse(data);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    return {
      ok: false,
      problem: `A saved board (${boardId}) could not be read and was left out. Check: ${fields.join(', ')}.`,
    };
  }
  const stored = result.data;
  const pieceIds = new Set(stored.pieces.map((piece) => piece.id));
  if (!stored.placements.every((placement) => pieceIds.has(placement.pieceId))) {
    return {
      ok: false,
      problem: `A saved board (${boardId}) places terrain it has no copy of and was left out.`,
    };
  }
  return { ok: true, value: { id: boardId, savedAt, ...contentOf(stored) } };
}

function contentOf(stored: BoardDocument): SavedBoardContent {
  const { name, presetId, deploymentId, board, seed, generatorVersion, enabledRules } = stored;
  return {
    name,
    layout: {
      board,
      placements: stored.placements.map(({ pieceId, x, y, rotation }) => ({
        pieceId,
        position: { x, y },
        rotation,
      })),
      seed,
      presetId,
      deploymentId,
      generatorVersion,
      enabledRules,
    },
    pieces: stored.pieces,
    edited: stored.edited,
    passed: stored.passed,
    matId: matIdOf(stored.matId),
  };
}

/** The fields written for a board, without its id (the document id) or timestamps. */
export function boardDocument(content: SavedBoardContent): BoardDocument {
  const { layout } = content;
  return {
    name: content.name,
    presetId: layout.presetId,
    deploymentId: layout.deploymentId,
    board: { width: layout.board.width, depth: layout.board.depth },
    seed: layout.seed,
    generatorVersion: layout.generatorVersion,
    enabledRules: [...layout.enabledRules],
    pieces: content.pieces.map(({ id: pieceId, name, type, footprint, quantity }) => ({
      id: pieceId,
      name,
      type,
      footprint: { ...footprint },
      quantity,
    })),
    placements: layout.placements.map(({ pieceId, position, rotation }) => ({
      pieceId,
      x: position.x,
      y: position.y,
      rotation,
    })),
    edited: content.edited,
    passed: content.passed,
    matId: content.matId,
    schemaVersion: BOARD_SCHEMA_VERSION,
  };
}
