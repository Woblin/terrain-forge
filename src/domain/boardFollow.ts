import type { Entry } from './boardEntry';
import type { CollectionSource } from './boardSource';
import { countMissingNow, currentLayout, type EditorSnapshot, type EditorState } from './editor';
import { SAMPLE_COLLECTION } from './sampleCollection';
import { changedPieces, libraryHasTerrain, placedTerrain } from './savedBoard';
import type { TerrainPiece } from './terrain';

/**
 * What the board page does once the player's library and settings have loaded: open the board the
 * address asked for, make a first board, or keep the board it has.
 */
export type StartAction =
  | { readonly kind: 'openSaved'; readonly id: string }
  | { readonly kind: 'fromEntry' }
  | { readonly kind: 'startingBoard' }
  | { readonly kind: 'nothing' };

/**
 * The page opens what it was opened for only in the library it opened in; another player's
 * library, after a sign-in or sign-out, gets a new board when there is none.
 */
export function startAction(entry: Entry, sameOwner: boolean, hasBoard: boolean): StartAction {
  if (sameOwner && entry.kind === 'saved') {
    return { kind: 'openSaved', id: entry.id };
  }
  if (sameOwner && entry.kind === 'new') {
    return { kind: 'fromEntry' };
  }
  return hasBoard ? { kind: 'nothing' } : { kind: 'startingBoard' };
}

/** What the board does when the terrain it is shown with changes. */
export type CollectionChange =
  | { readonly kind: 'ignore' }
  /** A saved board keeps the terrain it was saved with, of which `changed` pieces differ now. */
  | {
      readonly kind: 'keepSavedTerrain';
      readonly pieces: readonly TerrainPiece[];
      readonly changed: number;
    }
  /** The library emptied or got its first pieces: a new board on the other terrain. */
  | { readonly kind: 'newBoard'; readonly toSample: boolean }
  /** The board follows the library, after taking off the `missing` pieces that left it. */
  | { readonly kind: 'followLibrary'; readonly missing: number };

export interface CollectionChangeInput {
  /** The terrain the board saw before; null before the first board. */
  readonly seen: readonly TerrainPiece[] | null;
  /** The terrain of a board the page replaced, which it has nothing to follow for. */
  readonly replaced: readonly TerrainPiece[] | null;
  readonly collection: readonly TerrainPiece[];
  readonly knownIds: ReadonlySet<string>;
  readonly editor: EditorState;
  readonly source: CollectionSource;
  /** True when the board was opened from or saved as a saved board. */
  readonly saved: boolean;
}

export function collectionChange(input: CollectionChangeInput): CollectionChange {
  const { seen, editor, source, collection } = input;
  if (seen === null || editor.present === null || seen === input.replaced) {
    return { kind: 'ignore' };
  }
  const used = placedTerrain(seen, currentLayout(editor.present).placements);
  if (input.saved && source.kind === 'own' && !libraryHasTerrain(used, collection)) {
    return {
      kind: 'keepSavedTerrain',
      pieces: seen,
      changed: changedPieces(used, collection).length,
    };
  }
  const wasSample = seen === SAMPLE_COLLECTION;
  const isSample = collection === SAMPLE_COLLECTION;
  if (source.kind === 'own' && wasSample !== isSample) {
    return { kind: 'newBoard', toSample: isSample };
  }
  return { kind: 'followLibrary', missing: countMissingNow(editor, input.knownIds) };
}

/** Terrain kept with the board that the library holds unchanged becomes the library's again. */
export function adoptsLibrary(
  source: CollectionSource,
  present: EditorSnapshot | null,
  own: readonly TerrainPiece[],
): boolean {
  return (
    source.kind === 'saved' &&
    present !== null &&
    libraryHasTerrain(placedTerrain(source.pieces, currentLayout(present).placements), own)
  );
}
