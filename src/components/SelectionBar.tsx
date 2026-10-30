import { RotateCcwIcon, RotateCwIcon, Trash2Icon } from 'lucide-react';
import { BUTTON_STYLES } from './buttonStyles';
import { IconButton } from './IconButton';

interface SelectionBarProps {
  name: string;
  /** A short line about the piece, such as its size and turn. */
  detail: string;
  problems: readonly string[];
  onTurn: (degrees: number) => void;
  onRemove: () => void;
  onDone: () => void;
}

/** The selected piece and what can be done to it, in reach of a thumb. */
export function SelectionBar({
  name,
  detail,
  problems,
  onTurn,
  onRemove,
  onDone,
}: SelectionBarProps) {
  return (
    <div
      role="toolbar"
      aria-label={`${name} selected`}
      className={`on-leather bg-iron-raised shadow-shade rounded-sm border p-1.5 pl-3 shadow-2xl ${problems.length > 0 ? 'border-fail-line' : 'border-brass'}`}
    >
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-muted text-xs tabular-nums">{detail}</p>
        </div>
        <IconButton
          icon={RotateCcwIcon}
          label="Turn left 15 degrees"
          onClick={() => {
            onTurn(-15);
          }}
        />
        <IconButton
          icon={RotateCwIcon}
          label="Turn right 15 degrees"
          onClick={() => {
            onTurn(15);
          }}
        />
        <IconButton icon={Trash2Icon} label="Remove" onClick={onRemove} danger />
        <button type="button" onClick={onDone} className={`${BUTTON_STYLES.primary} h-11 px-4`}>
          Done
        </button>
      </div>
      {problems.map((problem) => (
        <p key={problem} role="status" className="text-fail px-0.5 pt-1 text-xs">
          ⚠ {problem}
        </p>
      ))}
    </div>
  );
}
