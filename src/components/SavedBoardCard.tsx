import { CopyIcon, FolderOpenIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import type { SavedBoard } from '../domain/savedBoard';
import { ActionsMenu } from './ActionsMenu';
import { DANGER_MENU_ROW, MENU_ROW } from './menuStyles';
import { SavedBoardBadge } from './SavedBoardBadge';
import { SavedBoardPicture } from './SavedBoardPicture';
import { savedDate, setupText } from './savedBoardText';
import { UnsavedChangesNote } from './UnsavedChangesNote';
import { SMALL_WAR_TABLE } from './warTableStyles';

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
 * One saved board: its picture on a small war table, what it is, and whether it passed the
 * balance rules. The whole card opens the board; the ⋯ menu, if any, holds the rest.
 */
export function SavedBoardCard({
  board,
  unsaved,
  onOpen,
  heading: Heading,
  manage,
}: SavedBoardCardProps) {
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
    <li className="parchment card-frame has-[[data-open]:focus-visible]:outline-accent-ink relative flex flex-col overflow-hidden rounded-sm has-[[data-open]:focus-visible]:outline-2">
      <div className={`mx-2 mt-2 ${SMALL_WAR_TABLE}`}>
        <div className="relative">
          <SavedBoardPicture board={board} className="w-full" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_22px_rgb(0_0_0/0.45)]"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pt-3 pb-3.5">
        <div className="flex items-start gap-1.5">
          <Heading className="font-display min-w-0 flex-1 text-xl leading-tight break-words">
            <button
              type="button"
              data-open
              onClick={onOpen}
              className="text-left outline-none after:absolute after:inset-0 after:rounded-sm"
            >
              {board.name}
            </button>
          </Heading>
          {actions.length > 0 && (
            <div className="relative z-10 -mt-1 -mr-1.5">
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
        <p className="text-soft">{setupText(board)}</p>
        <p className="text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <SavedBoardBadge passed={board.passed} />
          {board.edited && <span>Edited by hand</span>}
          <span>{savedDate(board.savedAt)}</span>
        </p>
        {unsaved && <UnsavedChangesNote />}
      </div>
    </li>
  );
}
