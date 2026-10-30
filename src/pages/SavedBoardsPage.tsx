import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { copyName, sortSavedBoards, type BoardOrder, type SavedBoard } from '../domain/savedBoard';
import { BoardNameDialog } from '../components/BoardNameDialog';
import { BUTTON_STYLES } from '../components/buttonStyles';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LibraryMessages } from '../components/LibraryMessages';
import { SaveStatus } from '../components/SaveStatus';
import { SavedBoardCard } from '../components/SavedBoardCard';
import { SegmentedControl, type Segment } from '../components/SegmentedControl';
import { useBoardSession } from '../hooks/boardSessionContext';
import { useBoardOpener } from '../hooks/useBoardOpener';
import { useSavedBoards } from '../hooks/savedBoardsContext';

const ORDERS: readonly Segment<BoardOrder>[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
];

/** What the player is being asked about, for one board. */
type Asking =
  | { readonly kind: 'rename'; readonly board: SavedBoard }
  | { readonly kind: 'duplicate'; readonly board: SavedBoard }
  | { readonly kind: 'delete'; readonly board: SavedBoard };

/** The boards saved in the player's account: open, rename, duplicate and delete them. */
export function SavedBoardsPage() {
  const savedBoards = useSavedBoards();
  const session = useBoardSession();
  const opener = useBoardOpener();
  const location = useLocation();
  const [asking, setAsking] = useState<Asking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [order, setOrder] = useState<BoardOrder>('newest');
  const { opened, setOpened } = session;
  const { boards } = savedBoards;

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
      <main className="flex-1 space-y-5 px-4 py-6 md:px-8 lg:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">My boards</h1>
            {savedBoards.access === 'account' && savedBoards.status === 'ready' && (
              <p className="text-muted text-sm">{countText(boards.length)}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {boards.length > 1 && (
              <SegmentedControl
                legend="Sort by"
                segments={ORDERS}
                value={order}
                onChange={setOrder}
                tone="iron"
              />
            )}
            <Link
              to="/board"
              state={{ newBoard: true }}
              className={`${BUTTON_STYLES.primary} text-sm`}
            >
              <PlusIcon className="size-4" aria-hidden="true" />
              New board
            </Link>
          </div>
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
              <div className="border-line-strong space-y-3 rounded-sm border border-dashed p-8 text-center">
                <p className="text-soft">No saved boards yet.</p>
                <p className="text-muted text-sm">
                  Generate a board you like, then save it from the Setup panel.
                </p>
                <Link to="/board" className={BUTTON_STYLES.secondary}>
                  Go to the board
                </Link>
              </div>
            ) : (
              <ul className="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] md:gap-4">
                {sortSavedBoards(boards, order).map((board) => (
                  <SavedBoardCard
                    key={board.id}
                    board={board}
                    unsaved={opener.unsavedId === board.id}
                    heading="h2"
                    onOpen={() => {
                      opener.request(board);
                    }}
                    manage={{
                      onRename: () => {
                        setAsking({ kind: 'rename', board });
                      },
                      onDuplicate: () => {
                        setActionError(null);
                        setAsking({ kind: 'duplicate', board });
                      },
                      onDelete: () => {
                        setAsking({ kind: 'delete', board });
                      },
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
      {opener.pending !== null && (
        <ConfirmDialog
          title="Leave your unsaved changes?"
          message={opener.discardMessage}
          confirmLabel="Open anyway"
          busy={false}
          error={null}
          onConfirm={opener.confirm}
          onCancel={opener.cancel}
        />
      )}
    </>
  );
}

function countText(count: number): string {
  return count === 1 ? '1 saved board' : `${String(count)} saved boards`;
}
