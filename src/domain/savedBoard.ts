import { currentLayout, type EditorSnapshot } from './editor';
import type { Layout } from './generator';
import { LIBRARY_LIMITS } from './library';
import type { Footprint, Placement, TerrainPiece } from './terrain';

export const SAVED_BOARD_LIMITS = {
  nameLength: 60,
  /** Boards one account can keep. */
  maxBoards: 100,
  /** Different pieces in a board's terrain, as in a library. */
  maxKinds: LIBRARY_LIMITS.maxKinds,
  /** Pieces standing on a board, as many as a library can hold. */
  maxPlacements: LIBRARY_LIMITS.maxPieces,
} as const;

/**
 * Everything needed to show a board again: the layout with its hand edits, and a copy of the
 * terrain it was made from, so that later changes to the library leave the board as it was.
 */
export interface SavedBoardContent {
  readonly name: string;
  readonly layout: Layout;
  readonly pieces: readonly TerrainPiece[];
  /** True when the layout was changed by hand after it was generated. */
  readonly edited: boolean;
  /** Whether every balance rule that was on passed when the board was saved. */
  readonly passed: boolean;
}

/** A board in the player's account. */
export interface SavedBoard extends SavedBoardContent {
  readonly id: string;
  /** When it was last saved or renamed, in milliseconds since 1970. */
  readonly savedAt: number;
}

/** What is shown on the board page about the saved board it holds. */
export interface OpenedBoard {
  readonly id: string;
  readonly name: string;
  /** The layout as it was last saved, from `layoutFingerprint`. */
  readonly fingerprint: string;
}

/** A name for a new board, such as "Warhammer Fantasy, Long edges, 27 Oct". */
export function defaultBoardName(presetName: string, deploymentName: string, date: Date): string {
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${presetName}, ${deploymentName}, ${day}`;
}

/** The name for a copy of a board, cut to fit. */
export function copyName(name: string): string {
  const suffix = ' (copy)';
  return `${name.slice(0, SAVED_BOARD_LIMITS.nameLength - suffix.length)}${suffix}`;
}

/** What is wrong with a board name, or null when it can be saved. */
export function boardNameError(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === '') {
    return 'Give the board a name.';
  }
  return trimmed.length > SAVED_BOARD_LIMITS.nameLength
    ? `Use at most ${String(SAVED_BOARD_LIMITS.nameLength)} characters.`
    : null;
}

/** Why another board cannot be saved, or null when there is room. */
export function boardLimitError(savedCount: number): string | null {
  return savedCount >= SAVED_BOARD_LIMITS.maxBoards
    ? `You have ${String(SAVED_BOARD_LIMITS.maxBoards)} saved boards, the most an account can keep. Delete some on the My boards page to save more.`
    : null;
}

/** The board on the page, ready to be saved under `name`. */
export function savedBoardContent(
  snapshot: EditorSnapshot,
  terrain: readonly TerrainPiece[],
  name: string,
  passed: boolean,
): SavedBoardContent {
  return {
    name: name.trim(),
    layout: currentLayout(snapshot),
    pieces: terrain.map(terrainOnly),
    edited: snapshot.edited,
    passed,
  };
}

/** A text that changes whenever the layout does, to tell if a board has unsaved changes. */
export function layoutFingerprint(layout: Layout): string {
  const { board, seed, presetId, deploymentId, generatorVersion, enabledRules } = layout;
  const placements = layout.placements.map(
    ({ pieceId, position, rotation }) =>
      `${pieceId}@${String(position.x)},${String(position.y)},${String(rotation)}`,
  );
  return JSON.stringify([
    board.width,
    board.depth,
    seed,
    presetId,
    deploymentId,
    generatorVersion,
    enabledRules,
    placements,
  ]);
}

/** True when the board on the page differs from the saved board it was opened from. */
export function hasUnsavedChanges(
  opened: OpenedBoard | null,
  snapshot: EditorSnapshot | null,
): boolean {
  return (
    opened !== null &&
    snapshot !== null &&
    layoutFingerprint(currentLayout(snapshot)) !== opened.fingerprint
  );
}

/** The pieces of the saved terrain that the library no longer has exactly as they were. */
export function changedPieces(
  saved: readonly TerrainPiece[],
  library: readonly TerrainPiece[],
): TerrainPiece[] {
  return saved.filter((piece) => {
    const current = library.find((candidate) => candidate.id === piece.id);
    return current === undefined || !samePiece(piece, current);
  });
}

/** The pieces of the terrain that stand on the board. */
export function placedTerrain(
  terrain: readonly TerrainPiece[],
  placements: readonly Placement[],
): TerrainPiece[] {
  const placed = new Set(placements.map((placement) => placement.pieceId));
  return terrain.filter((piece) => placed.has(piece.id));
}

/** True when the library still holds every piece of the saved terrain, unchanged. */
export function libraryHasTerrain(
  saved: readonly TerrainPiece[],
  library: readonly TerrainPiece[],
): boolean {
  return changedPieces(saved, library).length === 0;
}

/**
 * True when a library piece's photo fits a piece of saved terrain: the same piece with the same
 * footprint, so the photo was cropped to the shape that is drawn.
 */
export function photoFits(piece: TerrainPiece, libraryPiece: TerrainPiece | undefined): boolean {
  return (
    libraryPiece !== undefined &&
    libraryPiece.id === piece.id &&
    sameFootprint(piece.footprint, libraryPiece.footprint)
  );
}

function samePiece(a: TerrainPiece, b: TerrainPiece): boolean {
  return (
    a.name === b.name &&
    a.type === b.type &&
    a.quantity === b.quantity &&
    sameFootprint(a.footprint, b.footprint)
  );
}

function sameFootprint(a: Footprint, b: Footprint): boolean {
  return a.kind === b.kind && a.width === b.width && a.depth === b.depth;
}

/** A piece without anything a library adds to it, such as its photo. */
function terrainOnly(piece: TerrainPiece): TerrainPiece {
  const { id, name, type, footprint, quantity } = piece;
  return { id, name, type, footprint: { ...footprint }, quantity };
}
