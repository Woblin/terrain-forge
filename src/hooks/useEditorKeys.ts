import { useEffect, useRef, type RefObject } from 'react';
import type { Point } from '../domain/geometry';

export interface EditorKeyActions {
  readonly undo: () => void;
  readonly redo: () => void;
  /** Moves the selected piece by this many inches. */
  readonly nudge: (delta: Point) => void;
  /** Turns the selected piece by this many degrees. */
  readonly turn: (degrees: number) => void;
  readonly remove: () => void;
  readonly escape: () => void;
}

/** Arrow steps in inches: a normal step, and a fine one with Shift held. */
const NUDGE_STEP = 0.5;
const FINE_NUDGE_STEP = 0.1;
const TURN_STEP = 15;

/**
 * Keyboard shortcuts for the editor. Undo and redo work anywhere except in text fields; keys that
 * act on the selected piece only work while the board or nothing else has focus.
 */
export function useEditorKeys(board: RefObject<Element | null>, actions: EditorKeyActions): void {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isEditingText(event.target)) {
        return;
      }
      const handled =
        historyKey(event, latest.current) ||
        (onBoardOrPage(event.target, board.current) && pieceKey(event, latest.current));
      if (handled) {
        event.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [board]);
}

function historyKey(event: KeyboardEvent, actions: EditorKeyActions): boolean {
  if (!(event.ctrlKey || event.metaKey)) {
    return false;
  }
  const key = event.key.toLowerCase();
  if (key === 'z') {
    if (event.shiftKey) {
      actions.redo();
    } else {
      actions.undo();
    }
    return true;
  }
  if (key === 'y') {
    actions.redo();
    return true;
  }
  return false;
}

function pieceKey(event: KeyboardEvent, actions: EditorKeyActions): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }
  const step = event.shiftKey ? FINE_NUDGE_STEP : NUDGE_STEP;
  const nudges: Record<string, Point> = {
    ArrowLeft: { x: -step, y: 0 },
    ArrowRight: { x: step, y: 0 },
    ArrowUp: { x: 0, y: -step },
    ArrowDown: { x: 0, y: step },
  };
  const nudge = nudges[event.key];
  if (nudge !== undefined) {
    actions.nudge(nudge);
    return true;
  }
  switch (event.key.toLowerCase()) {
    case 'q':
      actions.turn(-TURN_STEP);
      return true;
    case 'e':
      actions.turn(TURN_STEP);
      return true;
    case 'delete':
    case 'backspace':
      actions.remove();
      return true;
    case 'escape':
      actions.escape();
      return true;
    default:
      return false;
  }
}

function isEditingText(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select, dialog[open]') !== null)
  );
}

function onBoardOrPage(target: EventTarget | null, board: Element | null): boolean {
  return (
    target === document.body || (target instanceof Node && board !== null && board.contains(target))
  );
}
