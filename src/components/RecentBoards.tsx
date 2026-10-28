import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { recentBoards } from '../domain/savedBoard';
import { useBoardOpener } from '../hooks/useBoardOpener';
import { useSavedBoards } from '../hooks/savedBoardsContext';
import { ConfirmDialog } from './ConfirmDialog';
import { SavedBoardCard } from './SavedBoardCard';

/** How many saved boards the home page shows. */
const RECENT_COUNT = 3;

/** The player's latest saved boards, for picking up where they left off; nothing without any. */
export function RecentBoards() {
  const savedBoards = useSavedBoards();
  const opener = useBoardOpener();
  const boards = recentBoards(savedBoards.boards, RECENT_COUNT);
  if (savedBoards.access !== 'account' || boards.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="recent-boards-heading" className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-boards-heading" className="text-xl font-semibold tracking-tight">
          Your recent boards
        </h2>
        <Link
          to="/boards"
          className="text-accent-ink hover:text-accent-ink-hover inline-flex items-center gap-1 text-sm font-medium"
        >
          All boards
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
        {boards.map((board) => (
          <SavedBoardCard
            key={board.id}
            board={board}
            unsaved={opener.unsavedId === board.id}
            onOpen={() => {
              opener.request(board);
            }}
          />
        ))}
      </ul>
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
    </section>
  );
}
