import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { copyName, hasUnsavedChanges, type SavedBoard } from '../domain/savedBoard';
import { BoardNameDialog } from '../components/BoardNameDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LibraryMessages } from '../components/LibraryMessages';
import { SaveStatus } from '../components/SaveStatus';
import { SavedBoardRow } from '../components/SavedBoardRow';
import { useBoardSession } from '../hooks/boardSessionContext';
import { useSavedBoards } from '../hooks/savedBoardsContext';

/** What the player is being asked about, for one board. */
type Asking =
  | { readonly kind: 'rename'; readonly board: SavedBoard }
  | { readonly kind: 'duplicate'; readonly board: SavedBoard }
  | { readonly kind: 'delete'; readonly board: SavedBoard }
  | { readonly kind: 'discard'; readonly board: SavedBoard };

/** The boards saved in the player's account: open, rename, duplicate and delete them. */
export function SavedBoardsPage() {
  const savedBoards = useSavedBoards();
  const session = useBoardSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [asking, setAsking] = useState<Asking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { opened, setOpened } = session;
  const { present } = session.editor;
  const unsaved = hasUnsavedChanges(opened, present);
  // Opening a saved board replaces the board on the board page, with no undo.
  const atRisk = unsaved || (opened === null && present?.edited === true);
  const { boards } = savedBoards;

  function open(board: SavedBoard): void {
    void navigate(`/board?saved=${encodeURIComponent(board.id)}`);
  }

  function rename(board: SavedBoard, name: string): void {
    savedBoards.rename(board.id, name);
  }

  function remove(board: SavedBoard): void {
    savedBoards.remove(board.id);
    if (opened?.id === board.id) {
      setOpened(null);
    }
  }

  return (
    <>
      <main className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">My boards</h1>
            {savedBoards.access === 'account' && savedBoards.status === 'ready' && (
              <p className="text-muted text-sm">{countText(boards.length)}</p>
            )}
          </div>
          <Link
            to="/board"
            state={{ newBoard: true }}
            className="border-line-strong hover:bg-hover rounded-lg border px-3 py-1.5 text-sm"
          >
            New board
          </Link>
        </div>
        {savedBoards.access === 'signedOut' && (
          <p className="text-soft">
            <Link
              to="/sign-in"
              state={{ from: location.pathname }}
              className="text-accent-ink hover:text-accent-ink-hover underline"
            >
              Sign in
            </Link>{' '}
            to save boards and open them again on any device.
          </p>
        )}
        {savedBoards.access === 'unverified' && (
          <p className="text-soft">Verify your email to save boards to your account.</p>
        )}
        {savedBoards.access === 'account' && (
          <>
            <SaveStatus saving={savedBoards.saving} />
            <LibraryMessages
              loadError={savedBoards.loadError}
              problems={savedBoards.problems}
              actionError={actionError ?? savedBoards.writeError}
              loading={savedBoards.status === 'loading'}
            />
            {boards.length === 0 && savedBoards.status === 'ready' ? (
              <div className="border-line bg-surface space-y-3 rounded-2xl border p-4 shadow-sm">
                <p className="text-soft">No saved boards yet.</p>
                <Link
                  to="/board"
                  className="bg-accent text-on-accent hover:bg-accent-hover inline-block rounded-lg px-3 py-1.5 font-semibold"
                >
                  Go to the board
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {boards.map((board) => (
                  <SavedBoardRow
                    key={board.id}
                    board={board}
                    unsaved={unsaved && opened?.id === board.id}
                    onOpen={() => {
                      if (atRisk && opened?.id !== board.id) {
                        setAsking({ kind: 'discard', board });
                      } else {
                        open(board);
                      }
                    }}
                    onRename={() => {
                      setAsking({ kind: 'rename', board });
                    }}
                    onDuplicate={() => {
                      setActionError(null);
                      setAsking({ kind: 'duplicate', board });
                    }}
                    onDelete={() => {
                      setAsking({ kind: 'delete', board });
                    }}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      {asking?.kind === 'rename' && (
        <BoardNameDialog
          title="Rename board"
          initialName={asking.board.name}
          confirmLabel="Rename"
          onConfirm={(name) => {
            rename(asking.board, name);
            setAsking(null);
            return null;
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
      {asking?.kind === 'duplicate' && (
        <BoardNameDialog
          title="Duplicate board"
          initialName={copyName(asking.board.name)}
          confirmLabel="Duplicate"
          onConfirm={(name) => {
            const result = savedBoards.save({ ...asking.board, name }, null);
            if (!result.ok) {
              return result.message;
            }
            setAsking(null);
            return null;
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
      {asking?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete this board?"
          message={`"${asking.board.name}" is deleted for good. This can't be undone.`}
          confirmLabel="Delete"
          busy={false}
          error={null}
          onConfirm={() => {
            remove(asking.board);
            setAsking(null);
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
      {asking?.kind === 'discard' && (
        <ConfirmDialog
          title="Leave your unsaved changes?"
          message={`${opened === null ? 'The board on the board page is not saved' : `"${savedName(boards, opened.id) ?? opened.name}" has changes that are not saved`}. Opening "${asking.board.name}" replaces it.`}
          confirmLabel="Open anyway"
          busy={false}
          error={null}
          onConfirm={() => {
            open(asking.board);
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
    </>
  );
}

function savedName(boards: readonly SavedBoard[], boardId: string): string | undefined {
  return boards.find((board) => board.id === boardId)?.name;
}

function countText(count: number): string {
  return count === 1 ? '1 saved board' : `${String(count)} saved boards`;
}
