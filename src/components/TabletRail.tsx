import type { LucideIcon } from 'lucide-react';

export interface RailButton<Id extends string> {
  id: Id;
  label: string;
  icon: LucideIcon;
}

interface TabletRailProps<Id extends string> {
  label: string;
  buttons: readonly RailButton<Id>[];
  /** The panel that is open, which may belong to the other rail, or null. */
  open: Id | null;
  onToggle: (id: Id) => void;
}

/** A narrow strip beside the board on tablets, with a labelled button for each panel. */
export function TabletRail<Id extends string>({
  label,
  buttons,
  open,
  onToggle,
}: TabletRailProps<Id>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="parchment card-frame flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-sm py-2.5"
    >
      {buttons.map(({ id, label: buttonLabel, icon: Icon }) => {
        const isOpen = open === id;
        return (
          <button
            key={id}
            type="button"
            aria-expanded={isOpen}
            aria-controls={`tablet-panel-${id}`}
            onClick={() => {
              onToggle(id);
            }}
            className={`focus-visible:outline-brass-bright flex min-h-[60px] w-[60px] flex-col items-center justify-center gap-[3px] rounded-[3px] text-[13px] font-bold focus-visible:outline-2 ${isOpen ? 'bg-seal text-on-seal' : 'text-ink hover:bg-hover'}`}
          >
            <Icon className="size-5" aria-hidden="true" />
            {buttonLabel}
          </button>
        );
      })}
    </div>
  );
}
