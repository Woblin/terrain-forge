/** Tailwind classes for buttons and for links that look like buttons. */
export const BUTTON_STYLES = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 font-semibold text-on-accent shadow-sm hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink disabled:opacity-50',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong px-4 py-2 font-semibold hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink disabled:opacity-50',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2 font-semibold text-white shadow-sm hover:bg-danger-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink disabled:opacity-50',
  quiet:
    'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-soft hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-accent-ink disabled:opacity-50',
} as const;
