import type { LucideIcon } from 'lucide-react';

interface ToolToggleProps {
  icon: LucideIcon;
  label: string;
  /** The full name, shown as a tooltip. */
  title: string;
  pressed: boolean;
  onChange: (pressed: boolean) => void;
}

/** An on/off tool in the board toolbar, shown as an icon and, when there is room, a name; pressed tools glow brass. */
export function ToolToggle({ icon: Icon, label, title, pressed, onChange }: ToolToggleProps) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={pressed}
      onClick={() => {
        onChange(!pressed);
      }}
      className={`focus-visible:outline-brass-bright flex h-9 items-center gap-1.5 rounded-[3px] px-2 font-semibold focus-visible:outline-2 pointer-coarse:h-11 ${pressed ? 'text-brass-glow bg-[rgb(201_163_82/0.22)] shadow-[inset_0_0_0_1px_rgb(201_163_82/0.6)]' : 'text-on-iron hover:bg-hover'}`}
    >
      <Icon className="size-[17px] shrink-0" aria-hidden="true" />
      {/* Narrow toolbars show the icon alone; the name stays for screen readers and the tooltip. */}
      <span className="sr-only @min-[52rem]/toolbar:not-sr-only">{label}</span>
    </button>
  );
}
