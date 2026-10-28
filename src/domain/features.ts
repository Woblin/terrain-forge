import { add, dot, polygonDistance, polygonsOverlap, scale, type Point } from './geometry';
import {
  groupArea,
  groupBounds,
  memberPolygon,
  piecesOverlap,
  shiftGroup,
  turnGroup,
  type GroupMember,
  type PieceGroup,
} from './pieceGroup';
import { pick, randomBetween, randomInt, type RandomSource } from './random';
import { isJoined, type SpacingRules } from './spacing';
import type { TerrainType } from './terrain';

/**
 * Which smaller pieces like to stand right next to each kind of anchor. Starting values, to tune
 * after playing on generated boards.
 */
export const COMPANION_TYPES: Readonly<Record<TerrainType, readonly TerrainType[]>> = {
  building: ['wall', 'obstacle', 'crater'],
  hill: ['wall', 'forest'],
  ruin: ['crater', 'obstacle', 'wall'],
  forest: ['hill'],
  obstacle: [],
  wall: [],
  crater: [],
};

/** A companion covers at most this share of its anchor's area. */
export const COMPANION_MAX_SHARE = 0.4;
export const MAX_COMPANIONS = 2;

/** The four sides of an anchor, as outward directions in its own frame. */
const SIDES: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
/** Share of an anchor's side the companion's middle may slide along, either way from the middle. */
const MAX_SLIDE = 0.8;
/** Share of the join gap a companion keeps from its anchor, at least and at most. */
const GAP_SHARE = { min: 0.2, max: 0.8 } as const;
/** Steps that pull a companion in against a rounded anchor. */
const SNUG_STEPS = 3;

/** Where a companion stands against its anchor: which side, how far along, how close, how turned. */
export interface Attachment {
  readonly side: number;
  /** -1 to 1: from one end of the side to the other. */
  readonly slide: number;
  readonly gap: number;
  /** 0 to lie along the side, 90 to stand across it. */
  readonly turn: 0 | 90;
}

export function canAccompany(
  anchor: PieceGroup,
  companion: PieceGroup,
  companionsSoFar: number,
): boolean {
  const [main] = anchor;
  if (main === undefined || companionsSoFar >= MAX_COMPANIONS) {
    return false;
  }
  const liked = COMPANION_TYPES[main.piece.type];
  return (
    companion.every((member) => liked.includes(member.piece.type)) &&
    groupArea(companion) <= COMPANION_MAX_SHARE * groupArea([main])
  );
}

export function drawAttachment(
  random: RandomSource,
  spacing: SpacingRules,
  takenSides: readonly number[],
): Attachment {
  const free = SIDES.map((_, side) => side).filter((side) => !takenSides.includes(side));
  return {
    side: free.length > 0 ? pick(random, free) : randomInt(random, 0, SIDES.length - 1),
    slide: randomBetween(random, -MAX_SLIDE, MAX_SLIDE),
    gap: randomBetween(random, GAP_SHARE.min, GAP_SHARE.max) * spacing.joinGap,
    turn: random() < 0.5 ? 0 : 90,
  };
}

/**
 * The feature with the companion added against its anchor, the feature's first member, which
 * stands unturned at the origin. Null when the companion would not touch the anchor, or would
 * overlap a piece of the feature.
 */
export function attach(
  feature: PieceGroup,
  companion: PieceGroup,
  attachment: Attachment,
  spacing: SpacingRules,
): PieceGroup | null {
  const [anchor] = feature;
  if (anchor === undefined) {
    return null;
  }
  const outward = SIDES[attachment.side] ?? { x: 1, y: 0 };
  const beside = againstSide(anchor, companion, outward, attachment);
  const placed = snug([anchor], beside, outward, attachment.gap);
  if (placed === null || !touchesAnchor([anchor], placed, spacing)) {
    return null;
  }
  const grown = [...feature, ...placed];
  return piecesOverlap(grown) ? null : grown;
}

/** The companion turned and moved so its outline box sits the gap away from the anchor's side. */
function againstSide(
  anchor: GroupMember,
  companion: PieceGroup,
  outward: Point,
  attachment: Attachment,
): PieceGroup {
  const along = { x: -outward.y, y: outward.x };
  const anchorBox = boxCorners(groupBounds([anchor]));
  const turned = turnGroup(companion, attachment.turn);
  const companionBox = boxCorners(groupBounds(turned));
  const anchorReach = Math.max(...anchorBox.map((corner) => dot(corner, outward)));
  const anchorHalfSide = Math.max(...anchorBox.map((corner) => dot(corner, along)));
  const companionNear = Math.min(...companionBox.map((corner) => dot(corner, outward)));
  const companionMiddle =
    (Math.min(...companionBox.map((corner) => dot(corner, along))) +
      Math.max(...companionBox.map((corner) => dot(corner, along)))) /
    2;
  const outwardShift = anchorReach + attachment.gap - companionNear;
  const alongShift = attachment.slide * anchorHalfSide - companionMiddle;
  return shiftGroup(turned, add(scale(outward, outwardShift), scale(along, alongShift)));
}

function boxCorners(bounds: ReturnType<typeof groupBounds>): Point[] {
  const { minX, minY, maxX, maxY } = bounds;
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

/**
 * Pulls the companion in until it is the gap away from the anchor itself, not only from its
 * outline box, which matters next to an oval. Null if it would end up overlapping.
 */
function snug(
  anchor: PieceGroup,
  companion: PieceGroup,
  outward: Point,
  gap: number,
): PieceGroup | null {
  let current = companion;
  for (let step = 0; step < SNUG_STEPS; step++) {
    const extra = distanceBetween(anchor, current) - gap;
    if (extra <= 0) {
      break;
    }
    current = shiftGroup(current, scale(outward, -extra));
  }
  return overlaps(anchor, current) ? null : current;
}

function touchesAnchor(anchor: PieceGroup, companion: PieceGroup, spacing: SpacingRules): boolean {
  return isJoined(distanceBetween(anchor, companion), spacing);
}

function distanceBetween(a: PieceGroup, b: PieceGroup): number {
  const polygonsB = b.map(memberPolygon);
  return Math.min(
    ...a.map(memberPolygon).flatMap((pa) => polygonsB.map((pb) => polygonDistance(pa, pb))),
  );
}

function overlaps(a: PieceGroup, b: PieceGroup): boolean {
  const polygonsB = b.map(memberPolygon);
  return a.map(memberPolygon).some((pa) => polygonsB.some((pb) => polygonsOverlap(pa, pb)));
}
