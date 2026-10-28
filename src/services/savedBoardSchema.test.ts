import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import type { SavedBoardContent } from '../domain/savedBoard';
import { readBoards } from './savedBoards';
import { boardDocument, parseBoardDocument } from './savedBoardSchema';

const content: SavedBoardContent = {
  name: 'Game night',
  layout: {
    board: { width: 72, depth: 48 },
    placements: [
      { pieceId: 'ruin', position: { x: 10, y: 20 }, rotation: 0 },
      { pieceId: 'ruin', position: { x: 62, y: 28 }, rotation: 180 },
    ],
    seed: 4242,
    presetId: 'warhammer-fantasy',
    deploymentId: 'long-edges',
    generatorVersion: 2,
    enabledRules: ['coverInReach', 'coverage'],
  },
  pieces: [
    {
      id: 'ruin',
      name: 'Ruin',
      type: 'ruin',
      footprint: { kind: 'rect', width: 6, depth: 4 },
      quantity: 2,
    },
  ],
  edited: true,
  passed: false,
  matId: 'rocky-grass',
};

describe('saved board documents', () => {
  it('read back what was written', () => {
    expect(parseBoardDocument('b1', boardDocument(content), 99)).toEqual({
      ok: true,
      board: { id: 'b1', savedAt: 99, ...content },
    });
  });

  it('read a board saved before mats, or with an unknown mat, as plain', () => {
    const withoutMat: Record<string, unknown> = { ...boardDocument(content) };
    delete withoutMat.matId;
    for (const stored of [withoutMat, { ...withoutMat, matId: 'moon-dust' }]) {
      const result = parseBoardDocument('b1', stored, 0);
      expect(result.ok && result.board.matId).toBe('plain');
    }
  });

  it.each([
    ['an empty name', { name: ' ' }],
    ['an unknown rule', { enabledRules: ['luck'] }],
    ['a piece of an unknown type', { pieces: [{ ...content.pieces[0], type: 'swamp' }] }],
    ['another schema version', { schemaVersion: 2 }],
    ['a negative seed', { seed: -1 }],
    ['a mat id that is not a short text', { matId: 7 }],
  ])('leave out a board with %s', (_, fields) => {
    const result = parseBoardDocument('b1', { ...boardDocument(content), ...fields }, 0);
    expect(result.ok).toBe(false);
  });

  it('leave out a board that places a piece it has no copy of', () => {
    const stored = boardDocument(content);
    const result = parseBoardDocument(
      'b1',
      { ...stored, placements: [{ pieceId: 'tower', x: 1, y: 1, rotation: 0 }] },
      0,
    );
    expect(result).toEqual({
      ok: false,
      problem: 'A saved board (b1) places terrain it has no copy of and was left out.',
    });
  });

  it('list boards newest first and name the unreadable ones', () => {
    const older = { ...boardDocument(content), updatedAt: Timestamp.fromMillis(1000) };
    const newer = {
      ...boardDocument({ ...content, name: 'Newer' }),
      updatedAt: Timestamp.fromMillis(2000),
    };
    const snapshot = readBoards([
      ['old', older],
      ['broken', { name: 3 }],
      ['new', newer],
    ]);
    expect(snapshot.boards.map((board) => board.id)).toEqual(['new', 'old']);
    expect(snapshot.boards[0]?.savedAt).toBe(2000);
    expect(snapshot.problems).toHaveLength(1);
  });
});
