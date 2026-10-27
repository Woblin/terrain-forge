import { describe, expect, it } from 'vitest';
import type { LibraryPiece } from '../domain/library';
import { readSnapshot } from './terrainLibrary';
import { parsePieceDocument, pieceDocument, PIECE_SCHEMA_VERSION } from './terrainLibrarySchema';

const piece: LibraryPiece = {
  id: 'abc',
  name: 'Large ruin',
  type: 'ruin',
  footprint: { kind: 'rect', width: 12, depth: 6 },
  quantity: 4,
  image: { version: 2, ratio: 2 },
};

describe('piece documents', () => {
  it('round-trips a piece and ignores timestamps', () => {
    const stored = { ...pieceDocument(piece), createdAt: new Date(), updatedAt: new Date() };
    expect(stored.schemaVersion).toBe(PIECE_SCHEMA_VERSION);
    expect(stored).not.toHaveProperty('id');
    expect(parsePieceDocument('abc', stored)).toEqual({ ok: true, piece });
  });

  it('accepts a piece without a photo', () => {
    const stored = pieceDocument({ ...piece, image: null });
    expect(parsePieceDocument('abc', stored)).toMatchObject({ ok: true, piece: { image: null } });
  });

  it.each([
    ['an unknown type', { type: 'river' }],
    ['a side over the limit', { footprint: { kind: 'rect', width: 40, depth: 6 } }],
    ['a fractional quantity', { quantity: 1.5 }],
    ['an empty name', { name: '   ' }],
    ['an unknown schema version', { schemaVersion: 2 }],
    ['a missing photo field', { image: undefined }],
  ])('rejects %s and says which field', (_, change) => {
    const result = parsePieceDocument('bad', { ...pieceDocument(piece), ...change });
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.problem).toContain('A saved piece (bad) could not be read');
  });

  it('rejects data that is not an object', () => {
    expect(parsePieceDocument('x', null)).toMatchObject({ ok: false });
  });
});

describe('readSnapshot', () => {
  it('keeps valid pieces and reports the rest', () => {
    const snapshot = readSnapshot([
      ['abc', pieceDocument(piece)],
      ['bad', { name: 'Broken' }],
    ]);
    expect(snapshot.pieces).toEqual([piece]);
    expect(snapshot.problems).toHaveLength(1);
    expect(snapshot.problems[0]).toContain('(bad)');
  });
});
