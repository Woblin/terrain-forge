import { createContext, useContext, type ActionDispatch } from 'react';
import type { EditorAction, EditorState } from '../domain/editor';
import type { MatId } from '../domain/mats';
import type { OpenedBoard } from '../domain/savedBoard';
import type { TerrainPiece } from '../domain/terrain';

export const DEFAULT_DEPLOYMENT_ID = 'long-edges';

/** The game system and deployment picked for the next board. */
export interface BoardChoice {
  readonly presetId: string;
  readonly deploymentId: string;
}

/**
 * Where the board's pieces come from: the player's own terrain, a shared link, or terrain kept
 * with the board, such as a saved board whose pieces have changed in the library since.
 */
export type CollectionSource =
  | { readonly kind: 'own' }
  | { readonly kind: 'link'; readonly pieces: readonly TerrainPiece[] }
  | { readonly kind: 'saved'; readonly pieces: readonly TerrainPiece[] };

/** How the board is shown and edited. */
export interface BoardViewOptions {
  readonly snap: boolean;
  readonly movePairs: boolean;
  readonly showPhotos: boolean;
  /** Null until the player switches it, so that it follows the game's default. */
  readonly showLane: boolean | null;
  readonly showHidden: boolean;
  /** Distances from each piece to the board edges, for setting the board out on the table. */
  readonly showDistances: boolean;
  /** Off draws the plain board instead of the mat, without changing the board's mat. */
  readonly showMat: boolean;
}

/** How a board is shown before the player changes anything. */
export const DEFAULT_VIEW_OPTIONS: BoardViewOptions = {
  snap: true,
  movePairs: true,
  showPhotos: true,
  showLane: null,
  showHidden: false,
  showDistances: false,
  showMat: true,
};

/** Whether the view is as it starts, so that there is nothing to reset. */
export function isDefaultView(view: BoardViewOptions): boolean {
  return (Object.keys(DEFAULT_VIEW_OPTIONS) as (keyof BoardViewOptions)[]).every(
    (option) => view[option] === DEFAULT_VIEW_OPTIONS[option],
  );
}

/**
 * The board being worked on, kept above the pages so that it is still there after a visit to
 * another page. It lasts until the page reloads, or until another player's library takes over;
 * a board made before signing in stays, so that it can be saved.
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
  /** The ground drawn under the board's terrain, saved and shared with the board. */
  readonly mat: MatId;
  readonly setMat: (mat: MatId) => void;
  readonly view: BoardViewOptions;
  readonly setView: (change: Partial<BoardViewOptions>) => void;
  /** The terrain the board last saw, to notice pieces that left the library meanwhile. */
  readonly seenCollection: readonly TerrainPiece[] | null;
  readonly setSeenCollection: (collection: readonly TerrainPiece[]) => void;
  /** The saved board this board was opened from or last saved as, if any. */
  readonly opened: OpenedBoard | null;
  readonly setOpened: (opened: OpenedBoard | null) => void;
}

export const BoardSessionContext = createContext<BoardSession | null>(null);

export function useBoardSession(): BoardSession {
  const session = useContext(BoardSessionContext);
  if (session === null) {
    throw new Error('useBoardSession must be used inside BoardSessionProvider.');
  }
  return session;
}
