import { describe, expect, it } from 'vitest';
import { attach, canAccompany, drawAttachment, type Attachment } from './features';
import { polygonDistance, polygonsOverlap } from './geometry';
import { memberPolygon, soloGroup, type PieceGroup } from './pieceGroup';
import { createRandom } from './random';
import type { SpacingRules } from './spacing';
import type { Footprint, TerrainPiece, TerrainType } from './terrain';
import { wallChain } from './wallChains';

const spacing: SpacingRules = {
  minGap: 6,
  joinGap: 1,
  openTypes: ['hill'],
  openGap: 4,
  edge: null,
  clearZoneBack: null,
};

function piece(id: string, type: TerrainType, footprint: Footprint): TerrainPiece {
  return { id, name: id, type, footprint, quantity: 1 };
}

const building = piece('building', 'building', { kind: 'rect', width: 9.65, depth: 9.65 });
const forest = piece('forest', 'forest', { kind: 'ellipse', width: 10, depth: 8 });
const hill = piece('hill', 'hill', { kind: 'ellipse', width: 6, depth: 4 });
const wall = piece('wall', 'wall', { kind: 'rect', width: 5.12, depth: 0.59 });
const ruin = piece('ruin', 'ruin', { kind: 'rect', width: 7.48, depth: 5.91 });
const barricade = piece('barricade', 'obstacle', { kind: 'rect', width: 6, depth: 1 });
const bigHill = piece('big-hill', 'hill', { kind: 'ellipse', width: 14, depth: 10 });

function gapToAnchor(feature: PieceGroup): number {
  const [anchor, ...rest] = feature.map(memberPolygon);
  if (anchor === undefined) {
    throw new Error('Empty feature');
  }
  return Math.min(...rest.map((polygon) => polygonDistance(anchor, polygon)));
}

describe('canAccompany', () => {
  it('lets a barricade stand by a building, walls by a hill, and a small hill by a forest', () => {
    expect(canAccompany(soloGroup(building), soloGroup(barricade), 0)).toBe(true);
    expect(canAccompany(soloGroup(bigHill), wallChain(wall, [0]), 0)).toBe(true);
    expect(canAccompany(soloGroup(forest), soloGroup(hill), 0)).toBe(true);
  });

  it('keeps walls away from buildings and ruins', () => {
    expect(canAccompany(soloGroup(building), wallChain(wall, [0]), 0)).toBe(false);
    expect(canAccompany(soloGroup(ruin), wallChain(wall, [0]), 0)).toBe(false);
  });

  it('refuses kinds that do not go together, companions that are too large, and a third one', () => {
    expect(canAccompany(soloGroup(forest), wallChain(wall, [0]), 0)).toBe(false);
    expect(canAccompany(soloGroup(hill), soloGroup(forest), 0)).toBe(false);
    expect(canAccompany(soloGroup(building), soloGroup(barricade), 2)).toBe(false);
  });
});

describe('attach', () => {
  const sides = [0, 1, 2, 3];
  it.each(sides)('puts a wall chain against side %i, joined but not overlapping', (side) => {
    const attachment: Attachment = { side, slide: 0.3, gap: 0.5, turn: 0 };
    const feature = attach(soloGroup(building), wallChain(wall, [0]), attachment, spacing);
    if (feature === null) {
      throw new Error('No feature');
    }
    expect(feature).toHaveLength(3);
    expect(gapToAnchor(feature)).toBeCloseTo(0.5);
    const [anchor, ...rest] = feature.map(memberPolygon);
    rest.forEach((polygon) => {
      expect(anchor !== undefined && polygonsOverlap(anchor, polygon)).toBe(false);
    });
  });

  it('pulls a companion in against a rounded anchor', () => {
    const attachment: Attachment = { side: 1, slide: 0.6, gap: 0.4, turn: 90 };
    const feature = attach(soloGroup(forest), soloGroup(hill), attachment, spacing);
    expect(feature === null ? null : gapToAnchor(feature)).toBeCloseTo(0.4, 1);
  });

  it('keeps the anchor where it was', () => {
    const attachment: Attachment = { side: 2, slide: -0.5, gap: 0.2, turn: 90 };
    const feature = attach(soloGroup(building), wallChain(wall, []), attachment, spacing);
    expect(feature?.[0]).toEqual(soloGroup(building)[0]);
  });
});

describe('drawAttachment', () => {
  it('picks a free side and a gap inside the join gap', () => {
    const random = createRandom(4);
    for (let i = 0; i < 50; i++) {
      const attachment = drawAttachment(random, spacing, [0, 1, 2]);
      expect(attachment.side).toBe(3);
      expect(attachment.gap).toBeGreaterThan(0);
      expect(attachment.gap).toBeLessThan(spacing.joinGap);
    }
  });
});
