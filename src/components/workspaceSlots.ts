import type { ReactNode } from 'react';

/** The parts of the board page, which each layout arranges in its own way. */
export interface WorkspaceSlots {
  /** A message about the board, such as why it differs from the one asked for, or null. */
  notice: ReactNode;
  setup: ReactNode;
  fairness: ReactNode;
  pieces: ReactNode;
  /** The editing tools above the board on tablets and wider screens. */
  toolbar: ReactNode;
  /** The space the board is drawn in; the page measures it to fit the board. */
  boardAreaRef: (element: HTMLDivElement | null) => void;
  board: ReactNode;
  /** What each kind of terrain does, or null before there is a board. */
  legend: ReactNode;
  /** The legend and editing status under the board on tablets and wider screens. */
  footer: ReactNode;
  /** The round buttons over the board on phones, held upright or sideways. */
  phoneButtons: ReactNode;
  /** The selected piece's tools on phones, or null while nothing is selected. */
  selectionBar: ReactNode;
  /** What the phone sheet shows while it is pulled down, and the top of the sideways panel. */
  summary: ReactNode;
}

export const SETUP_TITLE = 'Setup';
export const DETAILS_TITLE = 'Fairness and pieces';
