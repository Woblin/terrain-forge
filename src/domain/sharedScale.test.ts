import { describe, expect, it } from 'vitest';
import { sharedView } from './sharedScale';
import type { TerrainPiece } from './terrain';

function piece(width: number, depth: number): TerrainPiece {
  return {
    id: `${String(width)}x${String(depth)}`,
    name: 'Piece',
    type: 'ruin',
    footprint: { kind: 'rect', width, depth },
    quantity: 1,
  };
}

describe('sharedView', () => {
  it('shows 14 x 10.5 inches when every piece fits', () => {
    expect(sharedView([piece(12, 6), piece(3, 3)])).toEqual({ width: 14, depth: 10.5 });
    expect(sharedView([])).toEqual({ width: 14, depth: 10.5 });
  });

  it('grows evenly to fit the largest piece with an inch to spare', () => {
    const view = sharedView([piece(4, 2), piece(19, 6)]);
    expect(view.width).toBeCloseTo(21);
    expect(view.depth).toBeCloseTo(15.75);
  });

  it('grows for a deep piece too', () => {
    expect(sharedView([piece(6, 12.5)]).depth).toBeCloseTo(14.5);
  });
});
