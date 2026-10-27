import type { Layout } from './generator';
import type { Point } from './geometry';
import type { Placement, TerrainPiece } from './terrain';

/** A piece standing on the board. The key tells apart copies of the same piece. */
export interface BoardPiece {
  readonly key: string;
  readonly placement: Placement;
}

/** What a layout was generated from: everything in a `Layout` except the placements. */
export type LayoutOrigin = Omit<Layout, 'placements'>;

/** One step in the undo history. */
export interface EditorSnapshot {
  readonly origin: LayoutOrigin;
  readonly pieces: readonly BoardPiece[];
  /** True once the generated layout has been changed by hand. */
  readonly edited: boolean;
}

export interface EditorState {
  readonly past: readonly EditorSnapshot[];
  /** Null until the first layout is generated. */
  readonly present: EditorSnapshot | null;
  readonly future: readonly EditorSnapshot[];
  readonly selected: string | null;
  readonly nextKey: number;
}

export interface PieceUpdate {
  readonly key: string;
  readonly position: Point;
  readonly rotation: number;
}

export type EditorAction =
  | {
      readonly type: 'generated';
      readonly layout: Layout;
      /** True when the board comes from other terrain, so undo cannot go back to the old one. */
      readonly newHistory?: boolean;
    }
  | { readonly type: 'placed'; readonly updates: readonly PieceUpdate[] }
  | {
      readonly type: 'added';
      readonly piece: TerrainPiece;
      readonly position: Point;
      readonly rotation: number;
    }
  | { readonly type: 'removed'; readonly key: string }
  | { readonly type: 'collectionChanged'; readonly pieceIds: ReadonlySet<string> }
  | { readonly type: 'selected'; readonly key: string | null }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' };

/** Undo steps kept; older ones are dropped. */
export const HISTORY_LIMIT = 100;

export const INITIAL_EDITOR_STATE: EditorState = {
  past: [],
  present: null,
  future: [],
  selected: null,
  nextKey: 0,
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'generated':
      return generated(action.newHistory === true ? withoutHistory(state) : state, action.layout);
    case 'placed':
      return placed(state, action.updates);
    case 'added':
      return added(state, action.piece, action.position, action.rotation);
    case 'removed':
      return removed(state, action.key);
    case 'collectionChanged':
      return collectionChanged(state, action.pieceIds);
    case 'selected':
      return selected(state, action.key);
    case 'undo':
      return undo(state);
    case 'redo':
      return redo(state);
  }
}

export function canUndo(state: EditorState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: EditorState): boolean {
  return state.future.length > 0;
}

/** The layout as it stands now, with any hand edits. */
export function currentLayout(snapshot: EditorSnapshot): Layout {
  return { ...snapshot.origin, placements: snapshot.pieces.map((piece) => piece.placement) };
}

/** How many more copies of the piece can go on the board. */
export function remainingCount(pieces: readonly BoardPiece[], piece: TerrainPiece): number {
  const onBoard = pieces.filter(({ placement }) => placement.pieceId === piece.id).length;
  return Math.max(0, piece.quantity - onBoard);
}

function commit(state: EditorState, next: EditorSnapshot): EditorState {
  const past = state.present === null ? state.past : [...state.past, state.present];
  return { ...state, past: past.slice(-HISTORY_LIMIT), present: next, future: [] };
}

function generated(state: EditorState, layout: Layout): EditorState {
  const { placements, ...origin } = layout;
  const pieces = placements.map((placement, i) => ({
    key: pieceKey(state.nextKey + i),
    placement,
  }));
  const next = commit(state, { origin, pieces, edited: false });
  return { ...next, selected: null, nextKey: state.nextKey + placements.length };
}

/** An empty editor that keeps counting piece keys, so no key is ever used twice. */
function withoutHistory(state: EditorState): EditorState {
  return { ...INITIAL_EDITOR_STATE, nextKey: state.nextKey };
}

function placed(state: EditorState, updates: readonly PieceUpdate[]): EditorState {
  const { present } = state;
  if (present === null) {
    return state;
  }
  const pieces = present.pieces.map((piece) => {
    const update = updates.find(({ key }) => key === piece.key);
    if (update === undefined || samePlacement(piece.placement, update)) {
      return piece;
    }
    const { position, rotation } = update;
    return { ...piece, placement: { ...piece.placement, position, rotation } };
  });
  const changed = pieces.some((piece, i) => piece !== present.pieces[i]);
  return changed ? commit(state, { ...present, pieces, edited: true }) : state;
}

function samePlacement(placement: Placement, update: PieceUpdate): boolean {
  return (
    placement.position.x === update.position.x &&
    placement.position.y === update.position.y &&
    placement.rotation === update.rotation
  );
}

function added(
  state: EditorState,
  piece: TerrainPiece,
  position: Point,
  rotation: number,
): EditorState {
  const { present } = state;
  if (present === null || remainingCount(present.pieces, piece) === 0) {
    return state;
  }
  const key = pieceKey(state.nextKey);
  const pieces = [...present.pieces, { key, placement: { pieceId: piece.id, position, rotation } }];
  const next = commit(state, { ...present, pieces, edited: true });
  return { ...next, selected: key, nextKey: state.nextKey + 1 };
}

function removed(state: EditorState, key: string): EditorState {
  const { present } = state;
  if (present === null || !present.pieces.some((piece) => piece.key === key)) {
    return state;
  }
  const pieces = present.pieces.filter((piece) => piece.key !== key);
  const next = commit(state, { ...present, pieces, edited: true });
  return { ...next, selected: state.selected === key ? null : state.selected };
}

/**
 * Drops pieces that are no longer in the collection from the board and from the undo history,
 * so undo can never bring back a piece that does not exist. Not an undo step itself.
 */
function collectionChanged(state: EditorState, pieceIds: ReadonlySet<string>): EditorState {
  if (state.present === null || missingAnywhere(state, pieceIds) === 0) {
    return state;
  }
  const keep = (snapshot: EditorSnapshot): EditorSnapshot => ({
    ...snapshot,
    pieces: snapshot.pieces.filter((piece) => pieceIds.has(piece.placement.pieceId)),
  });
  const present = keep(state.present);
  return {
    ...state,
    past: state.past.map(keep),
    present,
    future: state.future.map(keep),
    selected: keepSelection(present, state.selected),
  };
}

/** How many pieces anywhere in the editor's history are not in the collection. */
function missingAnywhere(state: EditorState, pieceIds: ReadonlySet<string>): number {
  const snapshots = state.present === null ? [] : [...state.past, state.present, ...state.future];
  return snapshots.reduce(
    (sum, snapshot) =>
      sum + snapshot.pieces.filter((piece) => !pieceIds.has(piece.placement.pieceId)).length,
    0,
  );
}

/** How many pieces on the board now are not in the collection. */
export function countMissingNow(state: EditorState, pieceIds: ReadonlySet<string>): number {
  return (
    state.present?.pieces.filter((piece) => !pieceIds.has(piece.placement.pieceId)).length ?? 0
  );
}

function selected(state: EditorState, key: string | null): EditorState {
  if (key === state.selected || (key !== null && !hasPiece(state.present, key))) {
    return state;
  }
  return { ...state, selected: key };
}

function undo(state: EditorState): EditorState {
  const previous = state.past.at(-1);
  if (previous === undefined || state.present === null) {
    return state;
  }
  return {
    ...state,
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
    selected: keepSelection(previous, state.selected),
  };
}

function redo(state: EditorState): EditorState {
  const [next, ...future] = state.future;
  if (next === undefined || state.present === null) {
    return state;
  }
  return {
    ...state,
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present: next,
    future,
    selected: keepSelection(next, state.selected),
  };
}

function keepSelection(snapshot: EditorSnapshot, key: string | null): string | null {
  return key !== null && hasPiece(snapshot, key) ? key : null;
}

function hasPiece(snapshot: EditorSnapshot | null, key: string): boolean {
  return snapshot?.pieces.some((piece) => piece.key === key) ?? false;
}

function pieceKey(n: number): string {
  return `piece-${String(n)}`;
}
