import { describe, expect, it } from 'vitest';
import { editorReducer, INITIAL_EDITOR_STATE, type EditorSnapshot } from './editor';
import type { Layout } from './generator';
import type { LibraryPiece } from './library';
import {
  boardLimitError,
  boardNameError,
  changedPieces,
  copyName,
  defaultBoardName,
  hasUnsavedChanges,
  layoutFingerprint,
  libraryHasTerrain,
  photoFits,
  placedTerrain,
  SAVED_BOARD_LIMITS,
  savedBoardContent,
} from './savedBoard';
import type { TerrainPiece } from './terrain';

const ruin: TerrainPiece = {
  id: 'ruin',
  name: 'Ruin',
  type: 'ruin',
  footprint: { kind: 'rect', width: 6, depth: 4 },
  quantity: 3,
};

const forest: TerrainPiece = {
  id: 'forest',
  name: 'Forest',
  type: 'forest',
  footprint: { kind: 'ellipse', width: 9, depth: 7 },
  quantity: 1,
};

const layout: Layout = {
  board: { width: 72, depth: 48 },
  placements: [
    { pieceId: 'ruin', position: { x: 10, y: 20 }, rotation: 0 },
    { pieceId: 'forest', position: { x: 30, y: 24 }, rotation: 45 },
  ],
  seed: 1234,
  presetId: 'warhammer-fantasy',
  deploymentId: 'long-edges',
  generatorVersion: 2,
  enabledRules: ['coverInReach', 'coverage'],
};

function snapshotOf(edited: boolean): EditorSnapshot {
  const state = editorReducer(INITIAL_EDITOR_STATE, { type: 'loaded', layout, edited });
  if (state.present === null) {
    throw new Error('No board.');
  }
  return state.present;
}

describe('board names', () => {
  it('name a new board after its game, deployment and day', () => {
    expect(defaultBoardName('Warhammer Fantasy', 'Long edges', new Date(2026, 9, 27))).toBe(
      'Warhammer Fantasy, Long edges, 27 Oct',
    );
  });

  it('name a copy without going over the limit', () => {
    expect(copyName('Game night')).toBe('Game night (copy)');
    const long = 'x'.repeat(SAVED_BOARD_LIMITS.nameLength);
    expect(copyName(long)).toHaveLength(SAVED_BOARD_LIMITS.nameLength);
    expect(copyName(long).endsWith(' (copy)')).toBe(true);
  });

  it('need some text, and not too much', () => {
    expect(boardNameError('  ')).toBe('Give the board a name.');
    expect(boardNameError('x'.repeat(61))).toBe('Use at most 60 characters.');
    expect(boardNameError(` ${'x'.repeat(60)} `)).toBeNull();
  });
});

describe('the saved board limit', () => {
  it('stops at 100 boards', () => {
    expect(boardLimitError(99)).toBeNull();
    expect(boardLimitError(100)).toMatch(/100 saved boards/);
  });
});

describe('savedBoardContent', () => {
  it('keeps the layout with its hand edits and a copy of the terrain', () => {
    const photographed: LibraryPiece = { ...ruin, image: { version: 2, ratio: 1.5 } };
    const content = savedBoardContent(snapshotOf(true), [photographed, forest], ' Night ', false);
    expect(content).toEqual({
      name: 'Night',
      layout,
      pieces: [ruin, forest],
      edited: true,
      passed: false,
    });
    expect(content.pieces[0]).not.toHaveProperty('image');
  });
});

describe('unsaved changes', () => {
  it('are found by comparing the layout with the saved one', () => {
    const snapshot = snapshotOf(false);
    const opened = { id: 'b1', name: 'Night', fingerprint: layoutFingerprint(layout) };
    expect(hasUnsavedChanges(opened, snapshot)).toBe(false);
    const moved = editorReducer(
      { ...INITIAL_EDITOR_STATE, present: snapshot },
      { type: 'placed', updates: [{ key: 'piece-0', position: { x: 11, y: 20 }, rotation: 0 }] },
    );
    expect(hasUnsavedChanges(opened, moved.present)).toBe(true);
  });

  it('never apply to a board that is not saved', () => {
    expect(hasUnsavedChanges(null, snapshotOf(true))).toBe(false);
  });

  it('include switched rules and another seed', () => {
    const base = layoutFingerprint(layout);
    expect(layoutFingerprint({ ...layout, enabledRules: ['coverage'] })).not.toBe(base);
    expect(layoutFingerprint({ ...layout, seed: 1 })).not.toBe(base);
  });
});

describe('saved terrain and the library', () => {
  it('match while the library holds every saved piece unchanged', () => {
    const extra: TerrainPiece = { ...ruin, id: 'new' };
    expect(libraryHasTerrain([ruin, forest], [forest, extra, ruin])).toBe(true);
  });

  it('list the pieces that changed or left the library', () => {
    const bigger = { ...ruin, footprint: { kind: 'rect' as const, width: 8, depth: 4 } };
    expect(changedPieces([ruin, forest], [bigger])).toEqual([ruin, forest]);
    expect(changedPieces([ruin], [{ ...ruin, name: 'Renamed' }])).toEqual([ruin]);
    expect(changedPieces([ruin], [{ ...ruin, quantity: 1 }])).toEqual([ruin]);
    expect(libraryHasTerrain([ruin], [])).toBe(false);
  });

  it('pick out the pieces that stand on the board', () => {
    const spare: TerrainPiece = { ...ruin, id: 'spare' };
    expect(placedTerrain([ruin, spare, forest], layout.placements)).toEqual([ruin, forest]);
  });

  it('use a library photo only for the same piece with the same footprint', () => {
    expect(photoFits(ruin, { ...ruin, name: 'Renamed' })).toBe(true);
    expect(photoFits(ruin, { ...ruin, footprint: { kind: 'ellipse', width: 6, depth: 4 } })).toBe(
      false,
    );
    expect(photoFits(ruin, { ...forest })).toBe(false);
    expect(photoFits(ruin, undefined)).toBe(false);
  });
});
