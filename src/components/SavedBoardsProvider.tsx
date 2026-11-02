import { useMemo, type ReactNode } from 'react';
import { canSave } from '../domain/account';
import { boardLimitError } from '../domain/savedBoard';
import { useAuth } from '../hooks/authContext';
import { useFirebase } from '../hooks/firebaseContext';
import {
  SavedBoardsContext,
  type SavedBoards,
  type SavedBoardsAccess,
} from '../hooks/savedBoardsContext';
import { useStoreReport, type LoadState } from '../hooks/useStoreReport';
import { createSavedBoardStore, type SavedBoardsSnapshot } from '../services/savedBoards';

const EMPTY: SavedBoardsSnapshot = { boards: [], problems: [], saving: false };

/** Shares the boards saved in the account of a player with a verified email with every page. */
export function SavedBoardsProvider({ children }: { children: ReactNode }) {
  const { db } = useFirebase();
  const { state, user } = useAuth();
  const savingUid = user !== null && canSave(user) ? user.uid : null;
  const store = useMemo(
    () => (savingUid === null ? null : createSavedBoardStore(db, savingUid)),
    [db, savingUid],
  );
  const { load, writeError, clearWriteError } = useStoreReport(store);

  const access = accessOf(state.status === 'signedIn', savingUid !== null);
  const value = useMemo((): SavedBoards => {
    const snapshot = load.status === 'ready' ? load.snapshot : EMPTY;
    return {
      access,
      status: statusOf(state.status === 'checking', store === null, load),
      boards: snapshot.boards,
      problems: snapshot.problems,
      saving: snapshot.saving,
      loadError: load.status === 'failed' ? load.message : null,
      writeError,
      save: (content, boardId) => {
        if (store === null || load.status !== 'ready') {
          return { ok: false, message: cannotSaveMessage(access) };
        }
        clearWriteError();
        // A board whose first save was refused is saved as a new one again.
        if (boardId !== null && snapshot.boards.some((board) => board.id === boardId)) {
          store.replace(boardId, content);
          return { ok: true, id: boardId };
        }
        const full = boardLimitError(snapshot.boards.length);
        if (full !== null) {
          return { ok: false, message: full };
        }
        const id = store.newId();
        store.create(id, content);
        return { ok: true, id };
      },
      rename: (boardId, name) => {
        clearWriteError();
        store?.rename(boardId, name);
      },
      remove: (boardId) => {
        clearWriteError();
        store?.remove(boardId);
      },
    };
  }, [load, writeError, clearWriteError, access, state.status, store]);

  return <SavedBoardsContext.Provider value={value}>{children}</SavedBoardsContext.Provider>;
}

function accessOf(signedIn: boolean, verified: boolean): SavedBoardsAccess {
  if (!signedIn) {
    return 'signedOut';
  }
  return verified ? 'account' : 'unverified';
}

function statusOf(
  checking: boolean,
  noStore: boolean,
  load: LoadState<SavedBoardsSnapshot>,
): SavedBoards['status'] {
  if (checking) {
    return 'loading';
  }
  return noStore ? 'ready' : load.status;
}

function cannotSaveMessage(access: SavedBoardsAccess): string {
  switch (access) {
    case 'signedOut':
      return 'Sign in to save boards.';
    case 'unverified':
      return 'Verify your email to save boards.';
    case 'account':
      return 'Your saved boards are still loading. Try again in a moment.';
  }
}
