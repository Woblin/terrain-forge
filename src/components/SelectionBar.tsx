import { RotateCcwIcon, RotateCwIcon, Trash2Icon } from 'lucide-react';

interface SelectionBarProps {
  name: string;
  problems: readonly string[];
  onTurn: (degrees: number) => void;
  onRemove: () => void;
}

const BUTTON =
  'focus-visible:outline-brass-bright hover:bg-hover h-11 rounded-[3px] focus-visible:outline-2';

const TURNS = [
  { degrees: -15, icon: RotateCcwIcon, label: 'Turn left 15 degrees' },
  { degrees: 15, icon: RotateCwIcon, label: 'Turn right 15 degrees' },
] as const;

/** The selected piece and what can be done to it, in reach of a thumb. */
export function SelectionBar({ name, problems, onTurn, onRemove }: SelectionBarProps) {
  return (
    <div
      role="toolbar"
      aria-label={`${name} selected`}
      className={`on-leather bg-iron-raised rounded-sm border py-[5px] pr-[5px] pl-3 shadow-[0_10px_24px_rgb(0_0_0/0.6)] ${problems.length > 0 ? 'border-fail-line' : 'border-brass'}`}
    >
      <div className="flex items-center gap-1">
        <p className="font-display text-brass-glow min-w-0 flex-1 truncate text-lg">{name}</p>
        {TURNS.map(({ degrees, icon: Icon, label }) => (
          <button
            key={degrees}
            type="button"
            aria-label={label}
            title={label}
            onClick={() => {
              onTurn(degrees);
            }}
            className={`${BUTTON} grid w-12 shrink-0 place-items-center`}
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        ))}
        <button
          type="button"
          onClick={onRemove}
          className={`${BUTTON} flex shrink-0 items-center gap-1.5 px-2.5 font-semibold text-[#f2a493]`}
        >
          <Trash2Icon className="size-[18px]" aria-hidden="true" />
          Remove
        </button>
      </div>
      {problems.map((problem) => (
        <p key={problem} role="status" className="px-0.5 pt-1 text-xs text-[#f2a493]">
          ⚠ {problem}
        </p>
      ))}
    </div>
  );
}
