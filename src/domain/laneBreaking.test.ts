import { describe, expect, it } from 'vitest';
import { longEdgeDeployment, type Board } from './board';
import { polygonBounds } from './geometry';
import { laneArea, laneBreakingChoice, laneExcess, type LaneSetup } from './laneBreaking';
import type { PlacedPiece } from './placement';
import { findPreset } from './presets';
import { placeFootprint, type TerrainPiece } from './terrain';

const board: Board = { width: 60, depth: 44 };
const effects = findPreset('warhammer-40k')?.terrainEffects;
if (effects === undefined) {
  throw new Error('The 40k preset is missing.');
}
const setup: LaneSetup = {
  board,
  deployment: longEdgeDeployment(board, 12),
  edgeMargin: 1,
  effects,
  maxLane: 48,
};

function wall(x: number, type: TerrainPiece['type'] = 'ruin'): PlacedPiece {
  const piece: TerrainPiece = {
    id: 'wall',
    name: 'Wall',
    type,
    footprint: { kind: 'rect', width: 2, depth: 20 },
    quantity: 1,
  };
  const placement = { pieceId: 'wall', position: { x, y: 22 }, rotation: 0 };
  const polygon = placeFootprint(piece.footprint, placement);
  return { piece, placement, polygon, bounds: polygonBounds(polygon) };
}

describe('laneArea', () => {
  it('leaves out the edge strip', () => {
    expect(polygonBounds(laneArea(board, 1))).toEqual({ minX: 1, minY: 1, maxX: 59, maxY: 43 });
  });
});

describe('laneExcess', () => {
  it('is positive on an empty board', () => {
    expect(laneExcess([], setup)).toBeGreaterThan(0);
  });

  it('is zero when blocking walls cut every lane short enough', () => {
    expect(laneExcess([wall(20), wall(40)], setup)).toBe(0);
  });

  it('ignores terrain that does not block line of sight', () => {
    expect(laneExcess([wall(20, 'hill'), wall(40, 'hill')], setup)).toBe(laneExcess([], setup));
  });
});

describe('laneBreakingChoice', () => {
  it('ranks a spot that cuts lanes better than one that does not', () => {
    const { rank } = laneBreakingChoice(setup);
    expect(rank([wall(30)], [])).toBeLessThan(rank([wall(30, 'hill')], []));
  });
});
