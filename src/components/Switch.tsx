import type { ReactNode } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

/** An on/off setting: a sliding switch with its label on the right. */
export function Switch({ checked, onChange, children }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm font-medium pointer-coarse:py-2.5">
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
        className="bg-switch-off peer-checked:bg-switch-on peer-focus-visible:outline-accent-ink after:bg-switch-knob relative h-5 w-[38px] shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(42_29_18/0.35)] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:shadow-[0_1px_2px_rgb(0_0_0/0.35),inset_0_0_0_1px_var(--color-brass-bright)] after:transition-transform peer-checked:after:translate-x-[18px] motion-reduce:transition-none motion-reduce:after:transition-none pointer-coarse:h-6 pointer-coarse:w-[42px] pointer-coarse:after:size-5 pointer-coarse:peer-checked:after:translate-x-[18px]"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}
