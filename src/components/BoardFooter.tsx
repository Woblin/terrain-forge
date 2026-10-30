import { ListIcon, XIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { formatLength, type LengthUnit } from '../domain/units';
import { useBoardTip } from '../hooks/useBoardTip';

interface BoardFooterProps {
  /** What each kind of terrain does, or null before there is a board. */
  legend: ReactNode;
  /** The selected piece's size or distances and the placement rules it breaks, or null. */
  selection: { problems: readonly string[]; detail?: string } | null;
  unit: LengthUnit;
}

const FOOTER_BUTTON =
  'flex h-8 items-center gap-1.5 rounded-[3px] border border-iron-line px-2.5 font-semibold text-on-iron hover:bg-hover focus-visible:outline-2 focus-visible:outline-brass-bright';

/**
 * Under the board: the terrain key, the keyboard shortcuts, and either a tip on editing or
 * what is wrong with the selected piece.
 */
export function BoardFooter({ legend, selection, unit }: BoardFooterProps) {
  const keyId = useId();
  const [keyOpen, setKeyOpen] = useState(false);
  const [showTip, dismissTip] = useBoardTip();
  return (
    <div className="text-on-iron-muted flex flex-col gap-2 px-3 pb-0.5 text-sm">
      {keyOpen && legend !== null && (
        <div
          id={keyId}
          className="border-iron-line bg-iron/70 rounded-sm border px-3.5 py-2.5 [&_ul]:text-sm"
        >
          {legend}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-x-3.5 gap-y-2">
        <button
          type="button"
          aria-expanded={keyOpen}
          aria-controls={keyId}
          disabled={legend === null}
          onClick={() => {
            setKeyOpen(!keyOpen);
          }}
          className={FOOTER_BUTTON}
        >
          <ListIcon className="size-[15px]" aria-hidden="true" />
          {keyOpen ? 'Hide key' : 'Key'}
        </button>
        <details className="pt-1 pointer-coarse:hidden">
          <summary className="text-on-iron cursor-pointer font-semibold">Shortcuts</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Tab and Shift+Tab move between pieces on the board.</li>
            <li>
              Arrow keys move the selected piece {formatLength(0.5, unit)}; with Shift,{' '}
              {formatLength(0.1, unit)}.
            </li>
            <li>Q and E turn it 15° left and right. Delete removes it. Escape lets go of it.</li>
            <li>Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes (Cmd on a Mac).</li>
          </ul>
        </details>
        <div role="status" className="ml-auto min-w-0 flex-1 basis-80 text-right">
          {selection !== null &&
          (selection.detail !== undefined || selection.problems.length > 0) ? (
            <>
              {selection.detail !== undefined && (
                <p className="text-on-iron pt-1 tabular-nums">{selection.detail}</p>
              )}
              {selection.problems.map((problem) => (
                <p key={problem} className="text-fail">
                  ⚠ {problem}
                </p>
              ))}
            </>
          ) : (
            showTip && (
              <p className="flex items-center justify-end gap-2 italic">
                <span>
                  <span className="text-on-iron font-semibold not-italic">Tip:</span> drag a piece
                  to move it, or its yellow handle to turn it. Drop it off the board to remove it.
                </span>
                <button
                  type="button"
                  aria-label="Dismiss tip"
                  onClick={dismissTip}
                  className="hover:bg-hover hover:text-on-iron focus-visible:outline-brass-bright grid size-7 shrink-0 place-items-center rounded-[3px] focus-visible:outline-2"
                >
                  <XIcon className="size-[15px]" aria-hidden="true" />
                </button>
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
