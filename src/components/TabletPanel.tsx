import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface TabletPanelProps {
  /** Matches the rail button that opens the panel. */
  id: string;
  title: string;
  side: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
}

/** A panel that slides over the board from beside its rail on tablets. */
export function TabletPanel({ id, title, side, onClose, children }: TabletPanelProps) {
  return (
    <section
      id={`tablet-panel-${id}`}
      aria-label={title}
      className={`parchment frame absolute inset-y-3 z-20 flex flex-col rounded-sm shadow-[0_20px_50px_rgb(0_0_0/0.7)] ${side === 'left' ? 'left-[96px] w-[340px]' : 'right-[96px] w-[360px]'}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 pt-3 pr-3 pl-5">
        <h2 className="font-display text-2xl">{title}</h2>
        <button
          type="button"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
          className="text-soft hover:bg-hover hover:text-ink focus-visible:outline-brass-bright grid size-11 place-items-center rounded-sm focus-visible:outline-2"
        >
          <XIcon className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-5">{children}</div>
    </section>
  );
}
