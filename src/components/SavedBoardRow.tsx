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
    <li className="border-line bg-surface flex flex-wrap items-center gap-3 rounded-2xl border p-3 shadow-sm">
      <BoardThumbnail board={board} />
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="font-semibold break-words">{board.name}</h2>
        <p className="text-soft text-sm">
          {setup === undefined
            ? 'A game Terrain Forge no longer knows'
            : `${setup.preset.name}, ${setup.deployment.name}`}
        </p>
        <p className="text-muted flex flex-wrap gap-x-3 text-xs">
          <span className={board.passed ? 'text-pass' : 'text-accent-ink'}>
            {board.passed ? 'Balance rules passed' : 'Some balance rules failed'}
          </span>
          {board.edited && <span>Edited by hand</span>}
          <span>Changed {savedDate(board.savedAt)}</span>
          {unsaved && <span className="text-accent-ink">Open with unsaved changes</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={onOpen}
          className="bg-accent text-on-accent hover:bg-accent-hover rounded-lg px-3 py-1.5 font-semibold"
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
            className="border-line-strong hover:bg-hover rounded-lg border px-3 py-1.5"
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
