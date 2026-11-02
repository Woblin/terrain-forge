import { describe, expect, it } from 'vitest';
import { pieceById, pieceFinder } from './layoutTerrain';
import type { TerrainPiece } from './terrain';

function ruin(id: string, name: string): TerrainPiece {
  return { id, name, type: 'ruin', footprint: { kind: 'rect', width: 6, depth: 4 }, quantity: 1 };
}

const collection = [ruin('a', 'First A'), ruin('b', 'B'), ruin('a', 'Second A')];

describe('pieceById and pieceFinder', () => {
  it('find the same piece, the first when two share an id', () => {
    const pieceOf = pieceFinder(collection);
    for (const id of ['a', 'b']) {
      expect(pieceOf(id)).toBe(pieceById(collection, id));
    }
    expect(pieceOf('a').name).toBe('First A');
  });

  it('fail loudly for a piece that is not in the collection', () => {
    const message = 'Terrain piece "c" is not in the collection.';
    expect(() => pieceById(collection, 'c')).toThrow(message);
    expect(() => pieceFinder(collection)('c')).toThrow(message);
  });
});
