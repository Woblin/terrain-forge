import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { Board } from '../domain/board';
import type { BoardPiece, EditorAction, PieceUpdate } from '../domain/editor';
import { distance, polygonBounds, type Point } from '../domain/geometry';
import { pieceById } from '../domain/layoutTerrain';
import { findMirrorTwin, withTwin } from '../domain/mirror';
import {
  gridStep,
  normalizeRotation,
  snapRotation,
  snapToEdgeMargin,
  snapToGrid,
} from '../domain/snapping';
import { placeFootprint, type TerrainPiece } from '../domain/terrain';
import type { LengthUnit } from '../domain/units';

export interface DragSettings {
  readonly pieces: readonly BoardPiece[];
  readonly board: Board;
  readonly collection: readonly TerrainPiece[];
  readonly edgeMargin: number;
  readonly unit: LengthUnit;
  /** Snap to the grid, 15 degree steps and the edge margin; Shift turns it off while held. */
  readonly snap: boolean;
  /** Move a generated pair's mirror twin along with the piece. */
  readonly movePairs: boolean;
}

export interface BoardDrag {
  /** Where pieces are shown while a drag is in progress, keyed by board key. */
  readonly preview: ReadonlyMap<string, PieceUpdate>;
  readonly startMove: (key: string, event: PointerEvent) => void;
  readonly startRotate: (key: string, event: PointerEvent) => void;
  readonly onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  readonly onPointerUp: (event: PointerEvent<SVGSVGElement>) => void;
  readonly cancel: () => void;
}

type Gesture =
  | {
      readonly kind: 'move';
      readonly key: string;
      readonly piece: TerrainPiece;
      readonly pointerId: number;
      readonly startClient: Point;
      readonly grabOffset: Point;
      readonly rotation: number;
      readonly twin: BoardPiece | undefined;
      readonly moved: boolean;
    }
  | {
      readonly kind: 'rotate';
      readonly key: string;
      readonly pointerId: number;
      readonly position: Point;
      readonly startAngle: number;
      readonly startRotation: number;
      readonly twin: BoardPiece | undefined;
    };

/** A press must travel this many CSS pixels before it becomes a drag rather than a tap. */
const DRAG_THRESHOLD_PX = 4;

/**
 * Dragging pieces to move them and dragging the handle to turn them, with mouse, pen or touch.
 * The pointer is captured by the board, so a piece keeps following outside it; dropping a
 * piece off the board removes it. One finished drag is one undo step.
 */
export function useBoardDrag(
  svg: RefObject<SVGSVGElement | null>,
  settings: DragSettings,
  dispatch: (action: EditorAction) => void,
): BoardDrag {
  const gesture = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<ReadonlyMap<string, PieceUpdate>>(() => new Map());

  function begin(event: PointerEvent, key: string): BoardPiece | undefined {
    const piece = settings.pieces.find((candidate) => candidate.key === key);
    if (piece === undefined || event.button !== 0) {
      return undefined;
    }
    event.stopPropagation();
    dispatch({ type: 'selected', key });
    svg.current?.setPointerCapture(event.pointerId);
    return piece;
  }

  function twinOf(key: string): BoardPiece | undefined {
    return settings.movePairs ? findMirrorTwin(settings.pieces, key, settings.board) : undefined;
  }

  function startMove(key: string, event: PointerEvent): void {
    const piece = begin(event, key);
    const point = toBoardPoint(svg.current, event);
    if (piece === undefined || point === null) {
      return;
    }
    const { position, rotation } = piece.placement;
    gesture.current = {
      kind: 'move',
      key,
      piece: pieceById(settings.collection, piece.placement.pieceId),
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      grabOffset: { x: position.x - point.x, y: position.y - point.y },
      rotation,
      twin: twinOf(key),
      moved: false,
    };
  }

  function startRotate(key: string, event: PointerEvent): void {
    const piece = begin(event, key);
    const point = toBoardPoint(svg.current, event);
    if (piece === undefined || point === null) {
      return;
    }
    const { position, rotation } = piece.placement;
    gesture.current = {
      kind: 'rotate',
      key,
      pointerId: event.pointerId,
      position,
      startAngle: angleTo(position, point),
      startRotation: rotation,
      twin: twinOf(key),
    };
  }

  function updatesFor(current: Gesture, point: Point, free: boolean): PieceUpdate[] {
    const snap = settings.snap && !free;
    // Off the board only the dragged piece is removed, so its twin stays where it is.
    const twin =
      current.kind === 'move' && !onBoard(point, settings.board) ? undefined : current.twin;
    const update =
      current.kind === 'move'
        ? moveUpdate(current, point, snap)
        : {
            key: current.key,
            position: current.position,
            rotation: rotationFor(current, point, snap),
          };
    return withTwin(update, twin, settings.board);
  }

  function moveUpdate(
    current: Extract<Gesture, { kind: 'move' }>,
    point: Point,
    snap: boolean,
  ): PieceUpdate {
    const raw = { x: point.x + current.grabOffset.x, y: point.y + current.grabOffset.y };
    if (!snap) {
      return { key: current.key, position: raw, rotation: current.rotation };
    }
    const gridded = snapToGrid(raw, gridStep(settings.unit));
    const placement = { pieceId: current.piece.id, position: gridded, rotation: current.rotation };
    const position = snapToEdgeMargin(
      gridded,
      polygonBounds(placeFootprint(current.piece.footprint, placement)),
      settings.board,
      settings.edgeMargin,
    );
    return { key: current.key, position, rotation: current.rotation };
  }

  /** The gesture for this pointer, or null; a gesture ends if its piece left the board meanwhile. */
  function gestureFor(event: PointerEvent): Gesture | null {
    const current = gesture.current;
    if (current?.pointerId !== event.pointerId) {
      return null;
    }
    if (!settings.pieces.some((piece) => piece.key === current.key)) {
      cancel();
      return null;
    }
    return current;
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>): void {
    const current = gestureFor(event);
    const point = toBoardPoint(svg.current, event);
    if (current === null || point === null) {
      return;
    }
    if (current.kind === 'move' && !current.moved) {
      const travelled = distance(current.startClient, { x: event.clientX, y: event.clientY });
      if (travelled < DRAG_THRESHOLD_PX) {
        return;
      }
      gesture.current = { ...current, moved: true };
    }
    const updates = updatesFor(current, point, event.shiftKey);
    setPreview(new Map(updates.map((update) => [update.key, update])));
  }

  function onPointerUp(event: PointerEvent<SVGSVGElement>): void {
    const current = gestureFor(event);
    if (current === null) {
      return;
    }
    gesture.current = null;
    setPreview(new Map());
    const point = toBoardPoint(svg.current, event);
    if (point === null || (current.kind === 'move' && !current.moved)) {
      return;
    }
    if (current.kind === 'move' && !onBoard(point, settings.board)) {
      dispatch({ type: 'removed', key: current.key });
      return;
    }
    dispatch({ type: 'placed', updates: updatesFor(current, point, event.shiftKey) });
  }

  function cancel(): void {
    gesture.current = null;
    setPreview(new Map());
  }

  return { preview, startMove, startRotate, onPointerMove, onPointerUp, cancel };
}

function rotationFor(
  current: Extract<Gesture, { kind: 'rotate' }>,
  point: Point,
  snap: boolean,
): number {
  const turned = current.startRotation + angleTo(current.position, point) - current.startAngle;
  return snap ? snapRotation(turned) : normalizeRotation(turned);
}

/** The direction from `from` to `to` in degrees, turning the same way as piece rotation. */
function angleTo(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function onBoard(point: Point, board: Board): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= board.width && point.y <= board.depth;
}

/** Screen position to board inches, through the board's viewBox. */
function toBoardPoint(
  svg: SVGSVGElement | null,
  event: { clientX: number; clientY: number },
): Point | null {
  const matrix = svg?.getScreenCTM() ?? null;
  if (matrix === null) {
    return null;
  }
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}
