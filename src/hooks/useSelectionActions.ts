import { useMemo, type ActionDispatch } from 'react';
import { boardCentre, type Board } from '../domain/board';
import type { BoardPiece, EditorAction, PieceUpdate } from '../domain/editor';
import { findById } from '../domain/findById';
import { add, type Point } from '../domain/geometry';
import { findMirrorTwin, withTwin } from '../domain/mirror';
import { placingOrder, stepPiece } from '../domain/placingOrder';
import { normalizeRotation, snapRotation } from '../domain/snapping';
import type { Placement, TerrainPiece } from '../domain/terrain';

export interface SelectionInput {
  readonly selectedKey: string | null;
  readonly dispatch: ActionDispatch<[EditorAction]>;
  /** The pieces on the board. */
  readonly pieces: readonly BoardPiece[];
  /** The pieces as shown, with a drag in progress. */
  readonly shownPieces: readonly BoardPiece[];
  readonly collection: readonly TerrainPiece[];
  readonly board: Board;
  readonly snap: boolean;
  readonly movePairs: boolean;
}

export interface SelectionActions {
  /** The selected piece on the board. */
  readonly selected: BoardPiece | undefined;
  /** The selected piece as shown, with a drag in progress. */
  readonly shownSelected: BoardPiece | undefined;
  /** The terrain piece the selected piece is. */
  readonly selectedPiece: TerrainPiece | undefined;
  /** The keys of the pieces in the order the player sets them out. */
  readonly order: readonly string[];
  readonly nudge: (delta: Point) => void;
  readonly turn: (degrees: number) => void;
  readonly removeSelected: () => void;
  readonly addPiece: (piece: TerrainPiece) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly stepThrough: (step: 1 | -1) => void;
}

/** The selected piece and what the player can do to it and the board. */
export function useSelectionActions(input: SelectionInput): SelectionActions {
  const { selectedKey, dispatch, pieces, board, snap, movePairs } = input;
  const selected = pieces.find((piece) => piece.key === selectedKey);
  const shownSelected = input.shownPieces.find((piece) => piece.key === selectedKey);
  const selectedPiece =
    shownSelected === undefined
      ? undefined
      : findById(input.collection, shownSelected.placement.pieceId);
  const order = useMemo(() => placingOrder(pieces), [pieces]);

  function updateSelected(change: (placement: Placement) => Omit<PieceUpdate, 'key'>): void {
    if (selected === undefined) {
      return;
    }
    const update = { key: selected.key, ...change(selected.placement) };
    const twin = movePairs ? findMirrorTwin(pieces, selected.key, board) : undefined;
    dispatch({ type: 'placed', updates: withTwin(update, twin, board) });
  }

  return {
    selected,
    shownSelected,
    selectedPiece,
    order,
    nudge: (delta) => {
      updateSelected(({ position, rotation }) => ({ position: add(position, delta), rotation }));
    },
    turn: (degrees) => {
      updateSelected(({ position, rotation }) => ({
        position,
        rotation: snap ? snapRotation(rotation + degrees) : normalizeRotation(rotation + degrees),
      }));
    },
    removeSelected: () => {
      if (selected !== undefined) {
        dispatch({ type: 'removed', key: selected.key });
      }
    },
    addPiece: (piece) => {
      dispatch({ type: 'added', piece, position: boardCentre(board), rotation: 0 });
    },
    undo: () => {
      dispatch({ type: 'undo' });
    },
    redo: () => {
      dispatch({ type: 'redo' });
    },
    stepThrough: (step) => {
      const key = stepPiece(order, selectedKey, step);
      if (key !== null) {
        dispatch({ type: 'selected', key });
      }
    },
  };
}
