/**
 * Tailwind classes for the wooden war table a board picture sits on: wood with a faint grain,
 * a dark inner edge, a brass outer edge and a deep shadow. Add the padding for its size.
 */
export const WAR_TABLE =
  'rounded-md bg-table-wood bg-[linear-gradient(90deg,rgb(0_0_0/0.12)_0,rgb(255_255_255/0.03)_30%,rgb(0_0_0/0.1)_60%,rgb(255_255_255/0.04)_100%)] shadow-[inset_0_0_0_1px_#2a1a0e,inset_0_1px_0_rgb(255_220_170/0.15),0_0_0_1px_var(--color-brass),0_22px_50px_rgb(0_0_0/0.6)]';

/** The pixels the board's war table adds on each side: its 12px padding. */
export const BOARD_TABLE_INSET = 12;

/** A small war table for a board thumbnail on a card: plain wood with the same two edges. */
export const SMALL_WAR_TABLE =
  'rounded-[3px] bg-table-wood p-1.5 shadow-[inset_0_0_0_1px_#2a1a0e,0_0_0_1px_var(--color-brass)]';
