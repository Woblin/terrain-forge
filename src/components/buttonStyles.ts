const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink disabled:opacity-50';

/** The seal-red fill, gradient, highlight and drop shadow of the primary button. */
const SEAL =
  'border border-seal-dark bg-seal bg-linear-to-b from-seal-top to-seal-bottom text-on-seal shadow-[inset_0_1px_0_rgb(255_220_180/0.25),0_2px_0_var(--color-seal-shadow),0_4px_10px_rgb(74_13_8/0.35)] hover:brightness-110';

/** Tailwind classes for buttons and for links that look like buttons. */
export const BUTTON_STYLES = {
  primary: `${BASE} ${SEAL} px-4 py-2 font-display text-lg leading-tight`,
  /** An outlined button on parchment, or on leather where the border and text turn light. */
  secondary: `${BASE} border border-button-line px-4 py-2 font-semibold hover:bg-hover`,
  /** A button that deletes: seal red, labelled in the body font so it never reads as the main action. */
  danger: `${BASE} ${SEAL} px-4 py-2 font-semibold`,
  /** An outlined seal-red button, for a destructive step that opens a confirmation first. */
  dangerOutline: `${BASE} border border-fail px-4 py-2 font-semibold text-fail hover:bg-fail-soft`,
  quiet: `${BASE} px-3 py-1.5 text-soft hover:bg-hover hover:text-ink`,
} as const;
