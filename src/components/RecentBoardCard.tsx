import type { SavedBoard } from '../domain/savedBoard';
import { SavedBoardPicture } from './SavedBoardPicture';
import { savedDate } from './savedBoardText';
import { UnsavedChangesNote } from './UnsavedChangesNote';

interface RecentBoardCardProps {
  board: SavedBoard;
  /** True when this is the board on the board page, with changes not saved yet. */
  unsaved: boolean;
  onOpen: () => void;
}

/** A saved board as a compact row on the home page: a small framed picture, its name and status. */
export function RecentBoardCard({ board, unsaved, onOpen }: RecentBoardCardProps) {
  return (
    <li className="parchment card-frame has-[[data-open]:focus-visible]:outline-accent-ink relative flex items-center gap-3.5 rounded-sm p-2.5 has-[[data-open]:focus-visible]:outline-2">
      <div className="bg-table-wood w-[120px] shrink-0 rounded-[2px] p-1 shadow-[0_0_0_1px_var(--color-brass)]">
        <SavedBoardPicture board={board} className="w-full" />
      </div>
      <div className="flex min-w-0 flex-col gap-[3px]">
        <h3 className="font-display text-lg leading-tight break-words">
          <button
            type="button"
            data-open
            onClick={onOpen}
            className="text-left outline-none after:absolute after:inset-0 after:rounded-sm"
          >
            {board.name}
          </button>
        </h3>
        <p className="text-muted flex flex-wrap gap-x-2.5 gap-y-1 text-xs">
          {board.passed ? (
            <span className="text-pass font-bold">✓ Passed</span>
          ) : (
            <span className="text-warn-ink font-bold">! Some rules failed</span>
          )}
          <span>{savedDate(board.savedAt)}</span>
        </p>
        {unsaved && <UnsavedChangesNote />}
      </div>
    </li>
  );
}
