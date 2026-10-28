/** Tailwind classes for text fields and drop-down lists, taller where fingers are used. */
export const FIELD_STYLES =
  'h-10 w-full rounded-lg border border-line-strong bg-raised px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent-ink aria-invalid:border-fail pointer-coarse:h-11';

/** Tailwind classes for the larger fields of a form that fills the page, such as signing in. */
export const LARGE_FIELD_STYLES =
  'h-12 w-full rounded-xl border border-line-strong bg-raised px-3.5 text-base focus-visible:outline-2 focus-visible:outline-accent-ink aria-invalid:border-fail';

/** Tailwind classes for the label above a field. */
export const LABEL_STYLES = 'mb-1.5 block text-xs font-medium text-muted';

/** Tailwind classes for the message under a field that says what is wrong with it. */
export const FIELD_ERROR_STYLES = 'mt-1.5 text-sm text-fail';
