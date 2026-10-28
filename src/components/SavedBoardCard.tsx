import {
  CheckIcon,
  CopyIcon,
  FolderOpenIcon,
  PencilIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import { resolveGameSetup } from '../domain/gameSetup';
import type { SavedBoard } from '../domain/savedBoard';
import { ActionsMenu } from './ActionsMenu';
import { DANGER_MENU_ROW, MENU_ROW } from './menuStyles';
import { SavedBoardPicture } from './SavedBoardPicture';

interface SavedBoardCardProps {
  board: SavedBoard;
  /** True when this is the board on the board page, with changes not saved yet. */
  unsaved: boolean;
  onOpen: () => void;
  /** The heading level for the board's name, to fit under the page's own headings. */
  heading: 'h2' | 'h3';
  /** Renaming, copying and deleting, in the ⋯ menu; left out where the card only opens. */
  manage?: BoardManagement;
}

interface BoardManagement {
  readonly onRename: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}

const MENU_ICON = 'text-muted size-4';

/**
 * One saved board: its picture, what it is, and whether it passed the balance rules. The whole
 * card opens the board; the ⋯ menu, if any, holds the rest. A row on phones, a card on wider
 * screens.
 */
export function SavedBoardCard({
  board,
  unsaved,
  onOpen,
  heading: Heading,
  manage,
}: SavedBoardCardProps) {
  const setup = resolveGameSetup(board.layout.presetId, board.layout.deploymentId);
  const actions =
    manage === undefined
      ? []
      : [
          { label: 'Open', icon: FolderOpenIcon, run: onOpen, danger: false },
          { label: 'Rename', icon: PencilIcon, run: manage.onRename, danger: false },
          { label: 'Duplicate', icon: CopyIcon, run: manage.onDuplicate, danger: false },
          { label: 'Delete', icon: Trash2Icon, run: manage.onDelete, danger: true },
        ];
  return (
    <li className="border-line bg-surface hover:border-line-strong has-[[data-open]:focus-visible]:outline-accent-ink relative flex gap-3 rounded-2xl border p-3 shadow-sm transition-colors has-[[data-open]:focus-visible]:outline-2 md:flex-col md:gap-0 md:overflow-hidden md:p-0">
      <SavedBoardPicture
        board={board}
        className="w-28 self-start rounded-lg md:w-full md:rounded-none"
      />
      <div className="min-w-0 flex-1 space-y-1 md:p-4">
        <div className="flex items-start gap-1">
          <Heading className="min-w-0 flex-1 font-semibold break-words">
            <button
              type="button"
              data-open
              onClick={onOpen}
              className="text-left outline-none after:absolute after:inset-0 after:rounded-2xl"
            >
              {board.name}
            </button>
          </Heading>
          {actions.length > 0 && (
            <div className="relative z-10 -mt-1 -mr-1">
              <ActionsMenu label={`More for ${board.name}`}>
                {(close) =>
                  actions.map(({ label, icon: Icon, run, danger }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        close();
                        run();
                      }}
                      className={danger ? DANGER_MENU_ROW : MENU_ROW}
                    >
                      <Icon className={danger ? 'size-4' : MENU_ICON} aria-hidden="true" />
                      {label}
                    </button>
                  ))
                }
              </ActionsMenu>
            </div>
          )}
        </div>
        <p className="text-soft text-sm">
          {setup === undefined
            ? 'A game Terrain Forge no longer knows'
            : `${setup.preset.name}, ${setup.deployment.name}`}
        </p>
        <p className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
          {board.passed ? (
            <span className="bg-pass-soft text-pass inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium">
              <CheckIcon className="size-3.5" aria-hidden="true" />
              Passed
            </span>
          ) : (
            <span className="bg-warn-soft text-warn-ink inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium">
              <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
              Some rules failed
            </span>
          )}
          {board.edited && <span>Edited by hand</span>}
          <span>{savedDate(board.savedAt)}</span>
          {unsaved && <span className="text-accent-ink">Open with unsaved changes</span>}
        </p>
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
