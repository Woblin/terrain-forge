import type { ReactNode } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

/** An on/off setting: a label with a sliding switch on the right. */
export function Switch({ checked, onChange, children }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm pointer-coarse:py-2.5">
      <span>{children}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="bg-line-strong peer-checked:bg-accent peer-focus-visible:outline-accent-ink relative h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4 motion-reduce:transition-none motion-reduce:after:transition-none"
      />
    </label>
  );
}
