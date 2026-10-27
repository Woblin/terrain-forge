interface ToolbarToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** An on/off option in the editor toolbar. */
export function ToolbarToggle({ label, checked, onChange }: ToolbarToggleProps) {
  return (
    <label className="has-[:focus-visible]:outline-accent-ink flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm has-[:focus-visible]:outline-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="accent-amber-500"
      />
      {label}
    </label>
  );
}
