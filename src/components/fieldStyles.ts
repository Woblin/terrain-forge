/** Tailwind classes for text fields and drop-down lists, taller where fingers are used. */
export const FIELD_STYLES =
  'h-10 w-full rounded-[3px] border border-line-strong bg-field px-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgb(42_29_18/0.12)] focus-visible:outline-2 focus-visible:outline-accent-ink aria-invalid:border-fail pointer-coarse:h-11';

/** Tailwind classes for the larger fields of a form that fills the page, such as signing in. */
export const LARGE_FIELD_STYLES =
  'h-11 w-full rounded-[3px] border border-line-strong bg-field px-3 text-base text-ink shadow-[inset_0_1px_2px_rgb(42_29_18/0.12)] focus-visible:outline-2 focus-visible:outline-accent-ink aria-invalid:border-fail';

/** Tailwind classes for the label above a field. */
export const LABEL_STYLES = 'mb-1.5 block text-xs font-semibold text-muted';

/** Tailwind classes for the label above a larger field. */
export const LARGE_LABEL_STYLES = 'mb-[5px] block text-sm font-semibold text-soft';

/** Tailwind classes for the message under a field that says what is wrong with it. */
export const FIELD_ERROR_STYLES = 'mt-1.5 text-sm text-fail';
