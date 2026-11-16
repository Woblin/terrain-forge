import { describe, expect, it } from 'vitest';
import type { Entry } from './boardEntry';
import {
  adoptsLibrary,
  collectionChange,
  startAction,
  type CollectionChangeInput,
} from './boardFollow';
import { OWN_SOURCE } from './boardSource';
import { editorReducer, INITIAL_EDITOR_STATE, type EditorState } from './editor';
import type { Layout } from './generator';
import { SAMPLE_COLLECTION } from './sampleCollection';
import type { TerrainPiece } from './terrain';

const ruin: TerrainPiece = {
  id: 'ruin',
  name: 'Ruin',
  type: 'ruin',
  footprint: { kind: 'rect', width: 6, depth: 4 },
  quantity: 2,
};
const forest: TerrainPiece = {
  id: 'forest',
  name: 'Forest',
  type: 'forest',
  footprint: { kind: 'ellipse', width: 8, depth: 6 },
  quantity: 1,
};
const library: readonly TerrainPiece[] = [ruin, forest];

const layout: Layout = {
  board: { width: 60, depth: 44 },
  placements: [
    { pieceId: 'ruin', position: { x: 10, y: 20 }, rotation: 0 },
    { pieceId: 'ruin', position: { x: 50, y: 24 }, rotation: 0 },
    { pieceId: 'forest', position: { x: 30, y: 22 }, rotation: 0 },
  ],
  seed: 1,
  presetId: 'warhammer-40k',
  deploymentId: 'long-edges',
  generatorVersion: 1,
  enabledRules: ['coverage'],
};

const withBoard: EditorState = editorReducer(INITIAL_EDITOR_STATE, {
  type: 'generated',
  layout,
  newHistory: true,
});

const NEW_ENTRY: Entry = {
  kind: 'new',
  link: { kind: 'empty' },
  choice: null,
  source: OWN_SOURCE,
  enabledRules: null,
  picked: false,
};

describe('startAction', () => {
  it('opens the saved board the page was opened for', () => {
    expect(startAction({ kind: 'saved', id: 'b1' }, true, false)).toEqual({
      kind: 'openSaved',
      id: 'b1',
    });
  });

  it('makes the new board the page was opened for', () => {
    expect(startAction(NEW_ENTRY, true, true)).toEqual({ kind: 'fromEntry' });
  });

  it('makes a first board for another player, or when the kept board is missing', () => {
    expect(startAction({ kind: 'saved', id: 'b1' }, false, false)).toEqual({
      kind: 'startingBoard',
    });
    expect(startAction({ kind: 'keep' }, true, false)).toEqual({ kind: 'startingBoard' });
  });

  it('keeps a board that is there', () => {
    expect(startAction(NEW_ENTRY, false, true)).toEqual({ kind: 'nothing' });
    expect(startAction({ kind: 'keep' }, true, true)).toEqual({ kind: 'nothing' });
  });
});

describe('collectionChange', () => {
  const base: CollectionChangeInput = {
    seen: library,
    replaced: null,
    collection: library,
    knownIds: new Set(['ruin', 'forest']),
    editor: withBoard,
    source: OWN_SOURCE,
    saved: false,
  };

  it('ignores the first terrain, a page with no board, and the terrain of a replaced board', () => {
    expect(collectionChange({ ...base, seen: null })).toEqual({ kind: 'ignore' });
    expect(collectionChange({ ...base, editor: INITIAL_EDITOR_STATE })).toEqual({
      kind: 'ignore',
    });
    expect(collectionChange({ ...base, replaced: library })).toEqual({ kind: 'ignore' });
  });

  it('keeps a saved board’s terrain when the library changed one of its pieces', () => {
    const smallerForest: TerrainPiece = {
      ...forest,
      footprint: { kind: 'ellipse', width: 6, depth: 6 },
    };
    expect(collectionChange({ ...base, saved: true, collection: [ruin, smallerForest] })).toEqual({
      kind: 'keepSavedTerrain',
      pieces: library,
      changed: 1,
    });
  });

  it('makes a new board when the library empties or gets its first pieces', () => {
    expect(collectionChange({ ...base, collection: SAMPLE_COLLECTION })).toEqual({
      kind: 'newBoard',
      toSample: true,
    });
    expect(collectionChange({ ...base, seen: SAMPLE_COLLECTION })).toEqual({
      kind: 'newBoard',
      toSample: false,
    });
  });

  it('does not switch terrain that came with a link', () => {
    expect(
      collectionChange({
        ...base,
        collection: SAMPLE_COLLECTION,
        source: { kind: 'link', pieces: library },
      }),
    ).toMatchObject({ kind: 'followLibrary' });
  });

  it('follows the library, counting the pieces that left it', () => {
    expect(collectionChange(base)).toEqual({ kind: 'followLibrary', missing: 0 });
    expect(
      collectionChange({ ...base, collection: [forest], knownIds: new Set(['forest']) }),
    ).toEqual({ kind: 'followLibrary', missing: 2 });
  });
});

describe('adoptsLibrary', () => {
  const kept = { kind: 'saved', pieces: library } as const;

  it('takes back terrain that the library holds unchanged', () => {
    expect(adoptsLibrary(kept, withBoard.present, [...library])).toBe(true);
  });

  it('keeps terrain that differs, and leaves own terrain and empty pages alone', () => {
    expect(adoptsLibrary(kept, withBoard.present, [ruin])).toBe(false);
    expect(adoptsLibrary(OWN_SOURCE, withBoard.present, library)).toBe(false);
    expect(adoptsLibrary(kept, null, library)).toBe(false);
  });
});
