interface ToolToggleProps {
  label: string;
  /** The full name, shown as a tooltip. */
  title: string;
  pressed: boolean;
  onChange: (pressed: boolean) => void;
}

/** An on/off tool in the board toolbar, named in text; pressed tools glow brass. */
export function ToolToggle({ label, title, pressed, onChange }: ToolToggleProps) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={pressed}
      onClick={() => {
        onChange(!pressed);
      }}
      className={`focus-visible:outline-brass-bright h-9 rounded-[3px] px-2.5 font-semibold focus-visible:outline-2 pointer-coarse:h-11 ${pressed ? 'text-brass-glow bg-[rgb(201_163_82/0.22)] shadow-[inset_0_0_0_1px_rgb(201_163_82/0.6)]' : 'text-on-iron hover:bg-hover'}`}
    >
      {label}
    </button>
  );
}
