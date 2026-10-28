import { useState } from 'react';
import { useNavigate } from 'react-router';
import { hasUnsavedChanges, type SavedBoard } from '../domain/savedBoard';
import { useBoardSession } from './boardSessionContext';
import { useSavedBoards } from './savedBoardsContext';

export interface BoardOpener {
  /** Opens the saved board on the board page, or first asks when that would lose changes. */
  readonly request: (board: SavedBoard) => void;
  /** The board waiting for the player to agree to lose their changes, or null. */
  readonly pending: SavedBoard | null;
  /** What the player is asked before their changes are replaced. */
  readonly discardMessage: string;
  readonly confirm: () => void;
  readonly cancel: () => void;
  /** The saved board that is on the board page with changes not saved yet, or null. */
  readonly unsavedId: string | null;
}

/**
 * Opening saved boards from a list. Opening one replaces the board on the board page with no undo,
 * so the player is asked first when that board has changes that are not saved.
 */
export function useBoardOpener(): BoardOpener {
  const navigate = useNavigate();
  const { boards } = useSavedBoards();
  const session = useBoardSession();
  const [pending, setPending] = useState<SavedBoard | null>(null);
  const { opened } = session;
  const { present } = session.editor;
  const unsaved = hasUnsavedChanges(opened, present);
  const atRisk = unsaved || (opened === null && present?.edited === true);

  function open(board: SavedBoard): void {
    void navigate(`/board?saved=${encodeURIComponent(board.id)}`);
  }

  const openedName =
    opened === null ? null : (boards.find((board) => board.id === opened.id)?.name ?? opened.name);
  const current =
    openedName === null
      ? 'The board on the board page is not saved'
      : `"${openedName}" has changes that are not saved`;

  return {
    request: (board) => {
      if (atRisk && opened?.id !== board.id) {
        setPending(board);
      } else {
        open(board);
      }
    },
    pending,
    discardMessage: pending === null ? '' : `${current}. Opening "${pending.name}" replaces it.`,
    confirm: () => {
      if (pending !== null) {
        open(pending);
      }
    },
    cancel: () => {
      setPending(null);
    },
    unsavedId: unsaved ? (opened?.id ?? null) : null,
  };
}
