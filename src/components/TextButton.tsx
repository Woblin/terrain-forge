import type { ReactNode } from 'react';

interface TextButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

/** A button that reads like a link, for small actions inside text. */
export function TextButton({ onClick, disabled = false, children }: TextButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="text-accent-ink hover:text-accent-ink-hover underline underline-offset-2 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
