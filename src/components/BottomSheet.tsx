import { useRef, type ReactNode } from 'react';

/** How far the sheet is pulled up. */
export type SheetHeight = 'peek' | 'half' | 'full';

const HEIGHTS: readonly SheetHeight[] = ['peek', 'half', 'full'];

const HEIGHT_CLASSES: Readonly<Record<SheetHeight, string>> = {
  peek: 'h-[4.75rem]',
  half: 'h-1/2',
  full: 'h-[calc(100%-1.5rem)]',
};

/** A drag shorter than this, in CSS pixels, counts as a tap on the handle. */
const TAP_DISTANCE = 8;

interface BottomSheetProps {
  label: string;
  height: SheetHeight;
  onHeightChange: (height: SheetHeight) => void;
  /** The one line shown while the sheet is pulled down. */
  summary: ReactNode;
  children: ReactNode;
}

/**
 * A sheet along the bottom of the screen that is pulled up over the board. Dragging the handle
 * up or down moves it one step; tapping the handle opens it halfway, or closes it.
 */
export function BottomSheet({
  label,
  height,
  onHeightChange,
  summary,
  children,
}: BottomSheetProps) {
  const dragStart = useRef<number | null>(null);

  function moveBy(steps: number): void {
    const index = HEIGHTS.indexOf(height) + steps;
    const next = HEIGHTS[Math.max(0, Math.min(HEIGHTS.length - 1, index))];
    if (next !== undefined) {
      onHeightChange(next);
    }
  }

  return (
    <section
      aria-label={label}
      className={`parchment border-brass absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl border-t shadow-[0_-12px_40px_var(--shade)] transition-[height] duration-200 motion-reduce:transition-none ${HEIGHT_CLASSES[height]}`}
    >
      <button
        type="button"
        aria-label={
          height === 'peek' ? `Open ${label.toLowerCase()}` : `Close ${label.toLowerCase()}`
        }
        aria-expanded={height !== 'peek'}
        onPointerDown={(event) => {
          dragStart.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const start = dragStart.current;
          dragStart.current = null;
          if (start === null) {
            return;
          }
          const moved = start - event.clientY;
          if (Math.abs(moved) < TAP_DISTANCE) {
            onHeightChange(height === 'peek' ? 'half' : 'peek');
          } else {
            moveBy(moved > 0 ? 1 : -1);
          }
        }}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            moveBy(event.key === 'ArrowUp' ? 1 : -1);
          }
        }}
        onClick={(event) => {
          // Pointer taps are handled on pointer up; this is for Enter and Space.
          if (event.detail === 0) {
            onHeightChange(height === 'peek' ? 'half' : 'peek');
          }
        }}
        className="focus-visible:outline-accent-ink flex h-6 shrink-0 touch-none items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <span className="bg-line-strong h-1 w-10 rounded-full" aria-hidden="true" />
      </button>
      {height === 'peek' ? (
        <div className="px-4 pb-3">{summary}</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-3">{children}</div>
      )}
    </section>
  );
}
