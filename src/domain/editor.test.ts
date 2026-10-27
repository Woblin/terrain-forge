import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  countMissingNow,
  currentLayout,
  editorReducer,
  HISTORY_LIMIT,
  INITIAL_EDITOR_STATE,
  remainingCount,
  type EditorAction,
  type EditorState,
} from './editor';
import type { Layout } from './generator';
import type { TerrainPiece } from './terrain';

const ruin: TerrainPiece = {
  id: 'ruin',
  name: 'Ruin',
  type: 'ruin',
  footprint: { kind: 'rect', width: 6, depth: 4 },
  quantity: 3,
};

function layout(seed: number, count = 2): Layout {
  return {
    board: { width: 60, depth: 44 },
    placements: Array.from({ length: count }, (_, i) => ({
      pieceId: 'ruin',
      position: { x: 10 + 10 * i, y: 20 },
      rotation: 0,
    })),
    seed,
    presetId: 'warhammer-40k',
    deploymentId: 'long-edges',
    generatorVersion: 1,
  };
}

function run(...actions: EditorAction[]): EditorState {
  return actions.reduce(editorReducer, INITIAL_EDITOR_STATE);
}

function keys(state: EditorState): string[] {
  return state.present?.pieces.map((piece) => piece.key) ?? [];
}

const move = (key: string, x: number): EditorAction => ({
  type: 'placed',
  updates: [{ key, position: { x, y: 20 }, rotation: 0 }],
});

describe('editorReducer', () => {
  it('starts empty and does nothing to edit before a layout exists', () => {
    expect(run(move('piece-0', 5))).toBe(INITIAL_EDITOR_STATE);
    expect(canUndo(INITIAL_EDITOR_STATE)).toBe(false);
  });

  it('gives generated pieces unique keys and keeps the layout', () => {
    const state = run({ type: 'generated', layout: layout(7) });
    expect(keys(state)).toEqual(['piece-0', 'piece-1']);
    expect(state.present && currentLayout(state.present)).toEqual(layout(7));
    expect(state.present?.edited).toBe(false);
  });

  it('moves and turns pieces as one undo step, marking the board edited', () => {
    const state = run(
      { type: 'generated', layout: layout(7) },
      {
        type: 'placed',
        updates: [
          { key: 'piece-0', position: { x: 1, y: 2 }, rotation: 30 },
          { key: 'piece-1', position: { x: 3, y: 4 }, rotation: 210 },
        ],
      },
    );
    expect(state.present?.pieces.map((piece) => piece.placement)).toEqual([
      { pieceId: 'ruin', position: { x: 1, y: 2 }, rotation: 30 },
      { pieceId: 'ruin', position: { x: 3, y: 4 }, rotation: 210 },
    ]);
    expect(state.present?.edited).toBe(true);
    expect(state.past).toHaveLength(1);
  });

  it('adds no undo step when nothing changes', () => {
    const generatedState = run({ type: 'generated', layout: layout(7) });
    expect(editorReducer(generatedState, move('piece-0', 10))).toBe(generatedState);
  });

  it('undoes and redoes in order, and a new edit clears redo', () => {
    let state = run(
      { type: 'generated', layout: layout(7) },
      move('piece-0', 5),
      move('piece-0', 6),
    );
    state = editorReducer(state, { type: 'undo' });
    expect(state.present?.pieces[0]?.placement.position.x).toBe(5);
    state = editorReducer(state, { type: 'undo' });
    expect(state.present?.pieces[0]?.placement.position.x).toBe(10);
    expect(state.present?.edited).toBe(false);
    state = editorReducer(state, { type: 'redo' });
    expect(state.present?.pieces[0]?.placement.position.x).toBe(5);
    expect(canRedo(state)).toBe(true);
    state = editorReducer(state, move('piece-0', 8));
    expect(canRedo(state)).toBe(false);
  });

  it('can undo a new generation back to the previous board', () => {
    let state = run(
      { type: 'generated', layout: layout(7) },
      { type: 'generated', layout: layout(8, 1) },
    );
    expect(state.present?.origin.seed).toBe(8);
    expect(keys(state)).toEqual(['piece-2']);
    state = editorReducer(state, { type: 'undo' });
    expect(state.present?.origin.seed).toBe(7);
    expect(keys(state)).toEqual(['piece-0', 'piece-1']);
  });

  it(`keeps at most ${String(HISTORY_LIMIT)} undo steps`, () => {
    const moves = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) => move('piece-0', i + 100));
    const state = run({ type: 'generated', layout: layout(7) }, ...moves);
    expect(state.past).toHaveLength(HISTORY_LIMIT);
  });

  it('adds pieces only while copies are left, selecting the new one', () => {
    const add: EditorAction = {
      type: 'added',
      piece: ruin,
      position: { x: 30, y: 22 },
      rotation: 0,
    };
    const once = run({ type: 'generated', layout: layout(7) }, add);
    expect(keys(once)).toEqual(['piece-0', 'piece-1', 'piece-2']);
    expect(once.selected).toBe('piece-2');
    expect(once.present && remainingCount(once.present.pieces, ruin)).toBe(0);
    expect(editorReducer(once, add)).toBe(once);
  });

  it('removes a piece and clears its selection', () => {
    const state = run(
      { type: 'generated', layout: layout(7) },
      { type: 'selected', key: 'piece-1' },
      { type: 'removed', key: 'piece-1' },
    );
    expect(keys(state)).toEqual(['piece-0']);
    expect(state.selected).toBeNull();
  });

  it('only selects pieces that exist, and drops a selection that undo takes away', () => {
    const generatedState = run({ type: 'generated', layout: layout(7) });
    expect(editorReducer(generatedState, { type: 'selected', key: 'nope' })).toBe(generatedState);
    const state = run(
      { type: 'generated', layout: layout(7) },
      { type: 'added', piece: ruin, position: { x: 30, y: 22 }, rotation: 0 },
      { type: 'undo' },
    );
    expect(state.selected).toBeNull();
  });

  it('drops pieces that left the collection from the board and the whole history', () => {
    const before = run(
      { type: 'generated', layout: layout(1, 3) },
      move('piece-2', 40),
      { type: 'selected', key: 'piece-2' },
      { type: 'undo' },
    );
    const others = layout(2, 1).placements.map((placement) => ({
      ...placement,
      pieceId: 'forest',
    }));
    const mixed = editorReducer(before, {
      type: 'generated',
      layout: { ...layout(2), placements: [...layout(2).placements, ...others] },
    });
    const ids = new Set(['forest']);
    expect(countMissingNow(mixed, ids)).toBe(2);
    const after = editorReducer(mixed, { type: 'collectionChanged', pieceIds: ids });
    expect(after.present?.pieces.map((piece) => piece.placement.pieceId)).toEqual(['forest']);
    expect(after.past.every((snapshot) => snapshot.pieces.length === 0)).toBe(true);
    expect(after.future).toEqual([]);
    expect(after.past).toHaveLength(mixed.past.length);
    expect(countMissingNow(after, ids)).toBe(0);
  });

  it('keeps the state and the selection when nothing left the collection', () => {
    const state = run(
      { type: 'generated', layout: layout(1) },
      { type: 'selected', key: 'piece-1' },
    );
    const same = editorReducer(state, { type: 'collectionChanged', pieceIds: new Set(['ruin']) });
    expect(same).toBe(state);
    const cleared = editorReducer(state, {
      type: 'collectionChanged',
      pieceIds: new Set<string>(),
    });
    expect(cleared.selected).toBeNull();
  });
});
