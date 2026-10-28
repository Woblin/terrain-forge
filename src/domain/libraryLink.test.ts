import { describe, expect, it } from 'vitest';
import { resolveGameSetup } from './gameSetup';
import { generateLayout } from './generator';
import { decodePieces, encodePieces, sameTerrain } from './libraryLink';
import type { TerrainPiece } from './terrain';

/** A library with the random-looking ids Firestore gives pieces. */
const library: TerrainPiece[] = [
  {
    id: 'zQ81',
    name: 'Gothic ruin',
    type: 'ruin',
    footprint: { kind: 'rect', width: 11.81, depth: 6 },
    quantity: 4,
  },
  {
    id: 'Ab3x',
    name: 'Wood',
    type: 'forest',
    footprint: { kind: 'ellipse', width: 9, depth: 7.5 },
    quantity: 2,
  },
  {
    id: 'k9Lm',
    name: 'Hab block',
    type: 'building',
    footprint: { kind: 'rect', width: 10, depth: 8 },
    quantity: 2,
  },
  {
    id: 'Q0aa',
    name: 'Sandbags',
    type: 'obstacle',
    footprint: { kind: 'rect', width: 6, depth: 1 },
    quantity: 4,
  },
  {
    id: 'mMm1',
    name: 'Small ruin',
    type: 'ruin',
    footprint: { kind: 'rect', width: 8, depth: 5 },
    quantity: 6,
  },
];

describe('piece links', () => {
  it('writes walls with their own code and reads them back as walls', () => {
    const walls: TerrainPiece[] = [
      {
        id: 'w1',
        name: 'Stone wall',
        type: 'wall',
        footprint: { kind: 'rect', width: 5.12, depth: 0.59 },
        quantity: 6,
      },
    ];
    expect(encodePieces(walls)).toBe('wr5.12x0.59x6');
    expect(decodePieces('wr5.12x0.59x6')?.[0]?.type).toBe('wall');
  });

  it('writes pieces in the order the generator takes them, without names', () => {
    expect(encodePieces(library)).toBe('fe9x7.5x2_or6x1x4_br10x8x2_rr8x5x6_rr11.81x6x4');
    expect(encodePieces(library)).not.toContain('Gothic');
  });

  it('reads back the same shapes with ids that keep the order', () => {
    const decoded = decodePieces(encodePieces(library));
    expect(decoded?.map((piece) => piece.id)).toEqual(['p000', 'p001', 'p002', 'p003', 'p004']);
    expect(decoded?.[0]).toEqual({
      id: 'p000',
      name: 'Forest',
      type: 'forest',
      footprint: { kind: 'ellipse', width: 9, depth: 7.5 },
      quantity: 2,
    });
  });

  it('gives the other player the very same board', () => {
    const setup = resolveGameSetup('warhammer-40k', 'long-edges');
    const decoded = decodePieces(encodePieces(library));
    if (setup === undefined || decoded === null) {
      throw new Error('Missing setup or pieces');
    }
    const request = { ...setup, seed: 2024, enabledRules: setup.preset.defaultRules };
    const mine = generateLayout({ ...request, pieces: library });
    const theirs = generateLayout({ ...request, pieces: decoded });
    if (!mine.ok || !theirs.ok) {
      throw new Error('Generation failed');
    }
    const where = (layout: typeof mine.layout) =>
      layout.placements.map(({ position, rotation }) => ({ position, rotation }));
    expect(where(theirs.layout)).toEqual(where(mine.layout));
    expect(theirs.report).toEqual(mine.report);
  }, 60_000);

  it('rejects text that is not a valid collection', () => {
    expect(decodePieces('')).toBeNull();
    expect(decodePieces('xr1x1x1')).toBeNull();
    expect(decodePieces('rq1x1x1')).toBeNull();
    expect(decodePieces('rr0.4x1x1')).toBeNull();
    expect(decodePieces('rr1x37x1')).toBeNull();
    expect(decodePieces('rr1x1x0')).toBeNull();
    expect(decodePieces('rr1x1x21')).toBeNull();
    expect(decodePieces(Array.from({ length: 51 }, () => 'rr1x1x1').join('_'))).toBeNull();
  });

  it('rejects more pieces in all than a library can hold', () => {
    const kinds = (count: number) => Array.from({ length: count }, () => 'rr1x1x20').join('_');
    expect(decodePieces(kinds(5))).toHaveLength(5);
    expect(decodePieces(kinds(6))).toBeNull();
  });

  it('knows a link to the same terrain, whatever the names and ids', () => {
    const decoded = decodePieces(encodePieces(library)) ?? [];
    expect(sameTerrain(decoded, library)).toBe(true);
    const fewer = library.map((piece, i) => (i === 0 ? { ...piece, quantity: 3 } : piece));
    expect(sameTerrain(decoded, fewer)).toBe(false);
  });
});
