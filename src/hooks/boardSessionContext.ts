import { createContext, useContext, type ActionDispatch } from 'react';
import type { EditorAction, EditorState } from '../domain/editor';
import type { TerrainPiece } from '../domain/terrain';

export const DEFAULT_DEPLOYMENT_ID = 'long-edges';

/** The game system and deployment picked for the next board. */
export interface BoardChoice {
  readonly presetId: string;
  readonly deploymentId: string;
}

/** Where the board's pieces come from: the player's own terrain, or a shared link. */
export type CollectionSource =
  { readonly kind: 'own' } | { readonly kind: 'link'; readonly pieces: readonly TerrainPiece[] };

/** How the board is shown and edited. */
export interface BoardViewOptions {
  readonly snap: boolean;
  readonly movePairs: boolean;
  readonly showPhotos: boolean;
  readonly showLane: boolean;
  readonly showHidden: boolean;
}

/**
 * The board being worked on, kept above the pages so that it is still there after a visit to
 * another page. It lasts until the page reloads, or until another player's library takes over.
 */
export interface BoardSession {
  readonly editor: EditorState;
  readonly dispatch: ActionDispatch<[EditorAction]>;
  readonly choice: BoardChoice;
  readonly setChoice: (choice: BoardChoice) => void;
  readonly source: CollectionSource;
  readonly setSource: (source: CollectionSource) => void;
  readonly notice: string | null;
  readonly setNotice: (notice: string | null) => void;
  readonly view: BoardViewOptions;
  readonly setView: (change: Partial<BoardViewOptions>) => void;
  /** The terrain the board last saw, to notice pieces that left the library meanwhile. */
  readonly seenCollection: readonly TerrainPiece[] | null;
  readonly setSeenCollection: (collection: readonly TerrainPiece[]) => void;
}

export const BoardSessionContext = createContext<BoardSession | null>(null);

export function useBoardSession(): BoardSession {
  const session = useContext(BoardSessionContext);
  if (session === null) {
    throw new Error('useBoardSession must be used inside BoardSessionProvider.');
  }
  return session;
}
