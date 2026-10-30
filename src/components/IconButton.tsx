import type { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** For an on/off button: whether it is on. */
  pressed?: boolean;
  /** 'round' floats over the board; 'plain' sits in a toolbar or panel. */
  look?: 'plain' | 'round';
  /** True for a button that deletes something. */
  danger?: boolean;
  className?: string;
}

const LOOKS = {
  plain: 'size-9 rounded-[3px] pointer-coarse:size-11',
  round: 'on-leather size-11 rounded-full border border-brass bg-iron/90 shadow-lg shadow-shade',
} as const;

/** A button that shows only an icon; its label is read out and shown as a tooltip. */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  pressed,
  look = 'plain',
  danger = false,
  className = '',
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`focus-visible:outline-accent-ink grid shrink-0 place-items-center focus-visible:outline-2 disabled:opacity-35 ${LOOKS[look]} ${tone(pressed === true, danger)} ${className}`}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
    </button>
  );
}

function tone(pressed: boolean, danger: boolean): string {
  if (pressed) {
    return 'bg-accent-soft text-ink shadow-[inset_0_0_0_1px_rgb(201_163_82/0.6)]';
  }
  return danger
    ? 'text-fail enabled:hover:bg-fail-soft'
    : 'text-soft enabled:hover:bg-hover enabled:hover:text-ink';
}
