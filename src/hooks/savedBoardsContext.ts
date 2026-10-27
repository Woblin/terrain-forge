import { createContext, useContext } from 'react';
import type { SavedBoard, SavedBoardContent } from '../domain/savedBoard';

/** Who may save boards: nobody signed out, and only a verified email when signed in. */
export type SavedBoardsAccess = 'signedOut' | 'unverified' | 'account';

export type SaveResult =
  { readonly ok: true; readonly id: string } | { readonly ok: false; readonly message: string };

/** The boards saved in the player's account, and the actions on them. */
export interface SavedBoards {
  readonly access: SavedBoardsAccess;
  /** Always 'ready' with no boards when the player cannot save. */
  readonly status: 'loading' | 'ready' | 'failed';
  /** Newest first. */
  readonly boards: readonly SavedBoard[];
  /** Saved boards that could not be read. */
  readonly problems: readonly string[];
  /** True while changes are not saved yet, for example when offline. */
  readonly saving: boolean;
  /** Why the boards could not be loaded, when `status` is 'failed'. */
  readonly loadError: string | null;
  /** A change that was refused after the page showed it. */
  readonly writeError: string | null;
  /** Saves over the board `boardId`, or as a new board when it is null. */
  readonly save: (content: SavedBoardContent, boardId: string | null) => SaveResult;
  readonly rename: (boardId: string, name: string) => void;
  readonly remove: (boardId: string) => void;
}

export const SavedBoardsContext = createContext<SavedBoards | null>(null);

export function useSavedBoards(): SavedBoards {
  const boards = useContext(SavedBoardsContext);
  if (boards === null) {
    throw new Error('useSavedBoards must be used inside SavedBoardsProvider.');
  }
  return boards;
}
