import { resolveGameSetup } from '../domain/gameSetup';
import type { SavedBoard } from '../domain/savedBoard';
import { BoardThumbnail } from './BoardThumbnail';

interface SavedBoardRowProps {
  board: SavedBoard;
  /** True when this is the board on the board page, with changes not saved yet. */
  unsaved: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** One saved board in the list: a picture, what it is, and what can be done with it. */
export function SavedBoardRow({
  board,
  unsaved,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: SavedBoardRowProps) {
  const setup = resolveGameSetup(board.layout.presetId, board.layout.deploymentId);
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg bg-stone-800 p-3">
      <BoardThumbnail board={board} />
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="font-semibold break-words">{board.name}</h2>
        <p className="text-sm text-stone-300">
          {setup === undefined
            ? 'A game Terrain Forge no longer knows'
            : `${setup.preset.name}, ${setup.deployment.name}`}
        </p>
        <p className="flex flex-wrap gap-x-3 text-xs text-stone-400">
          <span className={board.passed ? 'text-green-300' : 'text-amber-300'}>
            {board.passed ? 'Balance rules passed' : 'Some balance rules failed'}
          </span>
          {board.edited && <span>Edited by hand</span>}
          <span>Saved {savedDate(board.savedAt)}</span>
          {unsaved && <span className="text-amber-300">Open with unsaved changes</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={onOpen}
          className="rounded bg-amber-500 px-3 py-1.5 font-semibold text-stone-950 hover:bg-amber-400"
        >
          Open
        </button>
        {(
          [
            ['Rename', onRename],
            ['Duplicate', onDuplicate],
            ['Delete', onDelete],
          ] as const
        ).map(([label, onClick]) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            aria-label={`${label} ${board.name}`}
            className="rounded border border-stone-500 px-3 py-1.5 hover:bg-stone-700"
          >
            {label}
          </button>
        ))}
      </div>
    </li>
  );
}

function savedDate(savedAt: number): string {
  return new Date(savedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
