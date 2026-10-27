import { createContext, useContext } from 'react';
import type { MovePlan } from '../domain/libraryMerge';

/** Pieces made before the player could save, waiting to move into their account. */
export interface UnsavedPieces {
  readonly plan: MovePlan;
  readonly moving: boolean;
  readonly error: string | null;
  /** Adds the planned pieces, with their photos, to the account. */
  readonly move: () => void;
  readonly discard: () => void;
}

export const UnsavedPiecesContext = createContext<UnsavedPieces | null>(null);

/** The unsaved pieces to offer, or null when there are none or the player cannot save yet. */
export function useUnsavedPieces(): UnsavedPieces | null {
  return useContext(UnsavedPiecesContext);
}
