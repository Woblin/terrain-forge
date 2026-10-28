/** Tailwind classes for one row in a pop-up menu, a link or a button. */
export const MENU_ROW =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent-ink disabled:opacity-40 pointer-coarse:py-3';

/** A menu row for something that deletes. */
export const DANGER_MENU_ROW = `${MENU_ROW} text-fail hover:bg-fail-soft`;
