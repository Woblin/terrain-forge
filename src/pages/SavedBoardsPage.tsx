import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { copyName, sortSavedBoards, type BoardOrder, type SavedBoard } from '../domain/savedBoard';
import { BoardNameDialog } from '../components/BoardNameDialog';
import { BUTTON_STYLES } from '../components/buttonStyles';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LibraryMessages } from '../components/LibraryMessages';
import { PageHeader } from '../components/PageHeader';
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
      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-[22px] px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-12">
        <PageHeader
          title="My boards"
          details={
            savedBoards.access === 'account' && savedBoards.status === 'ready'
              ? [countText(boards.length), <SaveStatus key="save" saving={savedBoards.saving} />]
              : []
          }
          actions={
            <>
              {boards.length > 1 && (
                <SegmentedControl
                  legend="Sort by"
                  shownLabel="Sort"
                  segments={ORDERS}
                  value={order}
                  onChange={setOrder}
                  tone="iron"
                  className="[&>label]:h-8"
                />
              )}
              <Link
                to="/board"
                state={{ newBoard: true }}
                className={`${BUTTON_STYLES.primary} h-11 px-[18px] text-[19px]`}
              >
                <PlusIcon className="size-[18px]" aria-hidden="true" />
                New board
              </Link>
            </>
          }
        />
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
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
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
