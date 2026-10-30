import type { ReactNode } from 'react';

/** The parts of the board page, which each layout arranges in its own way. */
export interface WorkspaceSlots {
  /** A message about the board, such as why it differs from the one asked for, or null. */
  notice: ReactNode;
  /** The board's name, save state and code, with loading, sharing and saving. */
  header: ReactNode;
  setup: ReactNode;
  fairness: ReactNode;
  pieces: ReactNode;
  /** Goes up each time the player asks to see the balance rules, held in the fairness slot. */
  rulesAsked: number;
  /** The id of the balance rules in the fairness slot, to focus them when asked. */
  rulesId: string;
  /** The editing tools above the board on tablets and wider screens. */
  toolbar: ReactNode;
  /** The space the board is drawn in; the page measures it to fit the board. */
  boardAreaRef: (element: HTMLDivElement | null) => void;
  board: ReactNode;
  /** What each kind of terrain does, or null before there is a board. */
  legend: ReactNode;
  /** The key, shortcuts and editing tip under the board on tablets and wider screens. */
  footer: ReactNode;
  /** The round buttons over the board on phones, held upright or sideways. */
  phoneButtons: ReactNode;
  /** The selected piece's tools on phones, or null while nothing is selected. */
  selectionBar: ReactNode;
  /** Previous and Next piece on phones while measuring, or null. */
  measureBar: ReactNode;
  /** What the phone sheet shows while it is pulled down, and the top of the sideways panel. */
  summary: ReactNode;
}

export const SETUP_TITLE = 'Setup';
export const DETAILS_TITLE = 'Fairness and pieces';
