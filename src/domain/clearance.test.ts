import { describe, expect, it } from 'vitest';
import { longEdgeDeployment, type Board } from './board';
import { isPassable, regimentClearance, type ClearanceRules } from './clearance';
import { placePiece, type PlacedPiece } from './placement';
import type { SpacingRules } from './spacing';
import type { TerrainPiece, TerrainType } from './terrain';

const board: Board = { width: 72, depth: 48 };
const deployment = longEdgeDeployment(board, 12);
const spacing: SpacingRules = {
  minGap: 6,
  joinGap: 1,
  openTypes: ['hill'],
  openGap: 4,
  edge: { hug: 2, open: 6 },
  clearZoneBack: null,
};
const regiment: ClearanceRules = { width: 5.9, minReach: 0.9 };

/** A row of blocks across the board at mid depth, `gap` inches apart, starting at the left edge. */
function rowWithGaps(gap: number, type: TerrainType = 'building'): PlacedPiece[] {
  const width = 10;
  const piece: TerrainPiece = {
    id: type,
    name: type,
    type,
    footprint: { kind: 'rect', width, depth: 4 },
    quantity: 10,
  };
  const pieces: PlacedPiece[] = [];
  for (let left = 0; left < board.width; left += width + gap) {
    const position = { x: left + width / 2, y: 24 };
    pieces.push(placePiece(piece, { pieceId: piece.id, position, rotation: 0 }));
  }
  return pieces;
}

function clearanceOf(pieces: readonly PlacedPiece[]) {
  return regimentClearance({ board, deployment, pieces, spacing, rules: regiment });
}

describe('regimentClearance', () => {
  it('lets a regiment go anywhere on an empty board', () => {
    expect(clearanceOf([])).toEqual({ connected: true, reach: 1 });
  });

  it('lets a regiment through gaps of 6 inches', () => {
    const clearance = clearanceOf(rowWithGaps(6));
    expect(clearance.connected).toBe(true);
    expect(isPassable(clearance, regiment)).toBe(true);
  });

  it('stops a regiment at gaps of 5 inches', () => {
    const clearance = clearanceOf(rowWithGaps(5));
    expect(clearance.connected).toBe(false);
    expect(isPassable(clearance, regiment)).toBe(false);
  });

  it('lets a regiment march over hills', () => {
    expect(clearanceOf(rowWithGaps(0.5, 'hill')).connected).toBe(true);
  });

  it('counts midfield walled in on every side as out of reach', () => {
    const walls = [
      ...[30, 40].map((y) =>
        placePiece(
          {
            id: 'w',
            name: 'w',
            type: 'wall',
            footprint: { kind: 'rect', width: 30, depth: 1 },
            quantity: 4,
          },
          { pieceId: 'w', position: { x: 36, y }, rotation: 0 },
        ),
      ),
      ...[21.5, 50.5].map((x) =>
        placePiece(
          {
            id: 'w',
            name: 'w',
            type: 'wall',
            footprint: { kind: 'rect', width: 1, depth: 11 },
            quantity: 4,
          },
          { pieceId: 'w', position: { x, y: 35 }, rotation: 0 },
        ),
      ),
    ];
    const clearance = clearanceOf(walls);
    expect(clearance.connected).toBe(true);
    expect(clearance.reach).toBeLessThan(1);
  });
});
