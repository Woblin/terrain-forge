import {
  boardCentre,
  boardPolygon,
  mirrorPoint,
  PLAYERS,
  zoneBacks,
  type Board,
  type DeploymentMap,
  type PlayerId,
} from './board';
import {
  add,
  boundsOverlap,
  centroid,
  clipLine,
  containsPolygon,
  polygonBounds,
  polygonDistance,
  polygonsOverlap,
  rectangle,
  rotate,
  scale,
  subtract,
  type Bounds,
  type Point,
  type Polygon,
} from './geometry';
import { groupArea, groupBounds, normalizeDegrees, type PieceGroup } from './pieceGroup';
import { pick, randomBetween, randomInt, type RandomSource } from './random';
import {
  edgeGapAllowed,
  isApart,
  isJoined,
  isOpenTerrain,
  requiredGap,
  type SpacingRules,
} from './spacing';
import { footprintArea, placeFootprint, type Placement, type TerrainPiece } from './terrain';

/** Two matching pieces, or one piece without a partner. */
export type PiecePairing =
  | { readonly kind: 'pair'; readonly pieces: readonly [TerrainPiece, TerrainPiece] }
  | { readonly kind: 'single'; readonly piece: TerrainPiece };

/**
 * What the generator places in one go: two matching groups placed as mirror images, or one group
 * placed near the centre line.
 */
export interface PlacementUnit {
  readonly groups: readonly [PieceGroup] | readonly [PieceGroup, PieceGroup];
  /** Smaller units to try instead when this one finds no spot: its chain or feature broken up. */
  readonly parts: readonly PlacementUnit[];
}

export interface PlacedPiece {
  readonly piece: TerrainPiece;
  readonly placement: Placement;
  readonly polygon: Polygon;
  readonly bounds: Bounds;
}

export interface PlacementRules {
  readonly board: Board;
  readonly deployment: DeploymentMap;
  readonly edgeMargin: number;
  readonly spacing: SpacingRules;
}

/** Pieces placed together as one group; inside a group, pieces may stand joined. */
export type PlacedGroup = readonly PlacedPiece[];

/** Footprint areas that differ by at most this share of the larger one can form a pair. */
const PAIR_AREA_TOLERANCE = 0.2;
const ATTEMPTS_PER_UNIT = 150;
/**
 * When the board cannot reach its target area without a unit, that unit keeps looking this long
 * for a first legal spot, since the last free room on a crowded board is hard to hit.
 */
const NEEDED_UNIT_ATTEMPTS = 400;
const ROTATION_STEP = 15;
/** Share of rectangular groups that stand square to the table edge; the rest tilt a little. */
const SQUARE_CHANCE = 0.6;
const TILTS = [-30, -15, 15, 30] as const;
/** At most this many pieces may stand fully inside one deployment zone. */
const MAX_PIECES_INSIDE_ZONE = 1;

/** One entry per physical piece, sorted by id so the order never depends on the input. */
export function expandCollection(pieces: readonly TerrainPiece[]): TerrainPiece[] {
  return [...pieces]
    .sort(compareIds)
    .flatMap((piece) => Array.from({ length: piece.quantity }, () => piece));
}

/** The order the generator takes pieces in. */
export function compareIds(a: TerrainPiece, b: TerrainPiece): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function canPair(a: TerrainPiece, b: TerrainPiece): boolean {
  const areaA = footprintArea(a.footprint);
  const areaB = footprintArea(b.footprint);
  return (
    a.type === b.type && Math.abs(areaA - areaB) <= PAIR_AREA_TOLERANCE * Math.max(areaA, areaB)
  );
}

/**
 * Pairs each piece, largest first, with the next largest piece it can pair with, so pieces of
 * close sizes end up together and as few as possible stay single. Units come largest first,
 * since big pieces are the hardest to fit once the board fills up. Equal sizes keep their input
 * order.
 */
export function pairPieces(pieces: readonly TerrainPiece[]): PiecePairing[] {
  const bySize = [...pieces].sort(
    (a, b) => footprintArea(b.footprint) - footprintArea(a.footprint),
  );
  const used = new Set<number>();
  const units: PiecePairing[] = [];
  bySize.forEach((piece, i) => {
    if (used.has(i)) {
      return;
    }
    used.add(i);
    const partner = bySize.findIndex((other, j) => !used.has(j) && canPair(piece, other));
    const other = bySize[partner];
    if (other === undefined) {
      units.push({ kind: 'single', piece });
    } else {
      used.add(partner);
      units.push({ kind: 'pair', pieces: [piece, other] });
    }
  });
  return units.sort((a, b) => pairingArea(b) - pairingArea(a));
}

export function pairingArea(pairing: PiecePairing): number {
  return pairing.kind === 'pair'
    ? pairing.pieces.reduce((sum, piece) => sum + footprintArea(piece.footprint), 0)
    : footprintArea(pairing.piece.footprint);
}

export function unitArea(unit: PlacementUnit): number {
  return unit.groups.reduce((sum, group) => sum + groupArea(group), 0);
}

export interface AreaTarget {
  /** Stop placing once the placed footprints reach this area. */
  readonly target: number;
  /** Never place more than this area. */
  readonly max: number;
}

/** Scores a legal spot for a unit; lower is better and 0 is perfect. */
export type SpotRanker = (
  candidate: readonly PlacedPiece[],
  placed: readonly PlacedPiece[],
) => number;

/**
 * How to choose among legal spots: without a ranker the first legal spot is taken, with one the
 * best of up to `spots` legal spots, or fewer once the best is good enough.
 */
export interface SpotChoice {
  readonly spots: number;
  readonly rank: SpotRanker;
  readonly goodEnough: (bestRank: number, legalSpots: number) => boolean;
}

/**
 * Places units in order until the target area is reached. A unit that would pass the maximum, or
 * that finds no legal spot, is broken into its parts, which are tried next; a unit without parts
 * is skipped.
 */
export function placeUnits(
  units: readonly PlacementUnit[],
  area: AreaTarget,
  rules: PlacementRules,
  random: RandomSource,
  choice?: SpotChoice,
): PlacedPiece[] {
  const placed: PlacedPiece[] = [];
  const queue = [...units];
  let total = 0;
  for (let unit = queue.shift(); unit !== undefined && total < area.target; unit = queue.shift()) {
    const size = unitArea(unit);
    const needed = total + queue.reduce((sum, next) => sum + unitArea(next), 0) < area.target;
    const attempts = needed ? NEEDED_UNIT_ATTEMPTS : ATTEMPTS_PER_UNIT;
    const pieces =
      total + size <= area.max ? placeUnit(unit, placed, rules, random, attempts, choice) : null;
    if (pieces === null) {
      queue.unshift(...unit.parts);
    } else {
      placed.push(...pieces);
      total += size;
    }
  }
  return placed;
}

function placeUnit(
  unit: PlacementUnit,
  placed: readonly PlacedPiece[],
  rules: PlacementRules,
  random: RandomSource,
  maxAttempts: number,
  choice?: SpotChoice,
): PlacedPiece[] | null {
  let best: PlacedPiece[] | null = null;
  let bestRank = Infinity;
  let legalSpots = 0;
  const inset = insetOf(unit.groups[0]);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt >= ATTEMPTS_PER_UNIT && best !== null) {
      break;
    }
    const groups =
      unit.groups.length === 2
        ? placePair(unit.groups, inset, rules.board, random)
        : [placeSingle(unit.groups[0], rules, random)];
    if (isLegal(groups, placed, rules)) {
      const candidate = groups.flat();
      if (choice === undefined) {
        return candidate;
      }
      const rank = choice.rank(candidate, placed);
      if (rank < bestRank) {
        best = candidate;
        bestRank = rank;
      }
      legalSpots++;
      if (legalSpots >= choice.spots || choice.goodEnough(bestRank, legalSpots)) {
        break;
      }
    }
  }
  return best;
}

/** However the group is turned, its centre is at least this far from the table edge. */
function insetOf(group: PieceGroup): number {
  const bounds = groupBounds(group);
  return Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2;
}

/** The first group anywhere it could fit, the second mirrored through the board centre. */
function placePair(
  [first, second]: readonly [PieceGroup, PieceGroup],
  inset: number,
  board: Board,
  random: RandomSource,
): PlacedGroup[] {
  const position = {
    x: randomBetween(random, inset, board.width - inset),
    y: randomBetween(random, inset, board.depth - inset),
  };
  const rotation = randomRotation(random, first);
  return [
    placeGroup(first, position, rotation),
    placeGroup(second, mirrorPoint(position, board), rotation + 180),
  ];
}

/** Somewhere on the line halfway between the two zones, where it favours neither player. */
function placeSingle(group: PieceGroup, rules: PlacementRules, random: RandomSource): PlacedGroup {
  const centre = boardCentre(rules.board);
  const direction = centreLineDirection(rules.deployment);
  const span = clipLine(boardPolygon(rules.board), centre, direction);
  const along = span === null ? 0 : randomBetween(random, span.start, span.end);
  return placeGroup(group, add(centre, scale(direction, along)), randomRotation(random, group));
}

/** Every piece of the group, with the group's centre at `position`, turned by `rotation`. */
export function placeGroup(group: PieceGroup, position: Point, rotation: number): PlacedPiece[] {
  return group.map((member) =>
    placed(
      member.piece,
      add(position, rotate(member.offset, rotation)),
      normalizeDegrees(member.rotation + rotation),
    ),
  );
}

/** Unit vector along the line that is equally far from both zones. */
function centreLineDirection(deployment: DeploymentMap): Point {
  const between = subtract(centroid(deployment.zones.B), centroid(deployment.zones.A));
  const length = Math.hypot(between.x, between.y);
  return { x: -between.y / length, y: between.x / length };
}

/**
 * A lone oval may face any way, since its turn barely shows. Anything with corners mostly stands
 * square to the table edge, and otherwise tilts a little.
 */
function randomRotation(random: RandomSource, group: PieceGroup): number {
  const [only] = group;
  if (group.length === 1 && only?.piece.footprint.kind === 'ellipse') {
    return randomInt(random, 0, 360 / ROTATION_STEP - 1) * ROTATION_STEP;
  }
  const square = randomInt(random, 0, 3) * 90;
  return random() < SQUARE_CHANCE ? square : normalizeDegrees(square + pick(random, TILTS));
}

function placed(piece: TerrainPiece, position: Point, rotation: number): PlacedPiece {
  return placePiece(piece, { pieceId: piece.id, position, rotation });
}

export function placePiece(piece: TerrainPiece, placement: Placement): PlacedPiece {
  const polygon = placeFootprint(piece.footprint, placement);
  return { piece, placement, polygon, bounds: polygonBounds(polygon) };
}

/** Where terrain may stand: the board without the strip along the table edge. */
export function playableArea(board: Board, edgeMargin: number): Polygon {
  return rectangle(edgeMargin, edgeMargin, board.width - edgeMargin, board.depth - edgeMargin);
}

/**
 * Hard rules for new groups: on the board, clear of or hugging the table edge, out of the clear
 * back of each zone, apart from every other group, and not crowding a zone. Pieces inside one group
 * are already spaced by the group.
 */
export function isLegal(
  candidate: readonly PlacedGroup[],
  placed: readonly PlacedPiece[],
  rules: PlacementRules,
): boolean {
  const { board, edgeMargin, spacing } = rules;
  const playable = playableArea(board, edgeMargin);
  const backs = clearBacks(rules);
  const pieces = candidate.flat();
  return (
    pieces.every(({ polygon }) => containsPolygon(playable, polygon)) &&
    pieces.every((piece) => respectsEdge(piece, board, spacing)) &&
    pieces.every((piece) => clearBacksEntered(piece, backs).length === 0) &&
    candidate.every((group, i) =>
      keepsApart(group, [...placed, ...candidate.slice(i + 1).flat()], spacing),
    ) &&
    leavesZonesOpen([...placed, ...pieces], rules.deployment)
  );
}

function keepsApart(
  group: PlacedGroup,
  others: readonly PlacedPiece[],
  spacing: SpacingRules,
): boolean {
  return group.every((piece) =>
    others.every((other) => {
      const needed = requiredGap(piece.piece, other.piece, spacing);
      return (
        !boundsOverlap(piece.bounds, other.bounds, needed) ||
        isApart(polygonDistance(piece.polygon, other.polygon), needed)
      );
    }),
  );
}

/** Each gap to a table edge, in the order left, right, near, far. */
function edgeGaps(piece: PlacedPiece, board: Board): number[] {
  const { minX, maxX, minY, maxY } = piece.bounds;
  return [minX, board.width - maxX, minY, board.depth - maxY];
}

function respectsEdge(piece: PlacedPiece, board: Board, spacing: SpacingRules): boolean {
  const { edge } = spacing;
  return (
    edge === null ||
    isOpenTerrain(piece.piece, spacing) ||
    edgeGaps(piece, board).every((gap) => edgeGapAllowed(gap, edge))
  );
}

function leavesZonesOpen(pieces: readonly PlacedPiece[], deployment: DeploymentMap): boolean {
  return PLAYERS.every(
    (player) =>
      pieces.filter(({ polygon }) => containsPolygon(deployment.zones[player], polygon)).length <=
      MAX_PIECES_INSIDE_ZONE,
  );
}

/** The back of each zone that stays clear of terrain, or none when the game has no such rule. */
function clearBacks(rules: PlacementRules): { player: PlayerId; back: Polygon }[] {
  const share = rules.spacing.clearZoneBack;
  if (share === null) {
    return [];
  }
  const backs = zoneBacks(rules.deployment, rules.board, share);
  return PLAYERS.map((player) => ({ player, back: backs[player] }));
}

/** The players whose clear zone back the piece stands in. */
function clearBacksEntered(
  piece: PlacedPiece,
  backs: readonly { player: PlayerId; back: Polygon }[],
): PlayerId[] {
  return backs
    .filter(({ back }) => polygonsOverlap(piece.polygon, back))
    .map(({ player }) => player);
}

/** A hard placement rule that a piece on the board breaks. */
export type PlacementViolation =
  | { readonly kind: 'offBoard' }
  | { readonly kind: 'edgeGap'; readonly distance: number }
  | { readonly kind: 'overlaps'; readonly other: number }
  | {
      readonly kind: 'tooClose';
      readonly other: number;
      readonly distance: number;
      readonly needed: number;
    }
  | { readonly kind: 'zoneCrowded'; readonly player: PlayerId }
  | { readonly kind: 'zoneBack'; readonly player: PlayerId };

/**
 * The hard rules from `isLegal` checked on a finished board: for each piece, in the same order,
 * every rule it breaks. `other` is the index of the piece it overlaps or stands too close to.
 * Pieces that stand joined, directly or through other pieces, make one feature, like a group
 * from the generator, and only need to keep apart from other features.
 */
export function boardViolations(
  pieces: readonly PlacedPiece[],
  rules: PlacementRules,
): PlacementViolation[][] {
  const playable = playableArea(rules.board, rules.edgeMargin);
  const crowded = crowdedZones(pieces, rules.deployment);
  const feature = featureNumbers(pieces, rules.spacing);
  const backs = clearBacks(rules);
  return pieces.map((piece, i) => {
    const onBoard = containsPolygon(playable, piece.polygon);
    const others = pieces.flatMap((other, j) =>
      j === i ? [] : [{ other, index: j, sameFeature: feature[j] === feature[i] }],
    );
    return [
      ...(onBoard ? edgeViolations(piece, rules) : [{ kind: 'offBoard' as const }]),
      ...neighbourViolations(piece, others, rules.spacing),
      ...crowded
        .filter(({ inside }) => inside.has(i))
        .map(({ player }) => ({ kind: 'zoneCrowded' as const, player })),
      ...clearBacksEntered(piece, backs).map((player) => ({ kind: 'zoneBack' as const, player })),
    ];
  });
}

/** The nearest table edge the piece neither hugs nor leaves room along. */
function edgeViolations(piece: PlacedPiece, rules: PlacementRules): PlacementViolation[] {
  const { edge } = rules.spacing;
  if (edge === null || isOpenTerrain(piece.piece, rules.spacing)) {
    return [];
  }
  const wrong = edgeGaps(piece, rules.board).filter((gap) => !edgeGapAllowed(gap, edge));
  return wrong.length === 0 ? [] : [{ kind: 'edgeGap', distance: Math.min(...wrong) }];
}

interface Neighbour {
  readonly other: PlacedPiece;
  readonly index: number;
  readonly sameFeature: boolean;
}

function neighbourViolations(
  piece: PlacedPiece,
  neighbours: readonly Neighbour[],
  spacing: SpacingRules,
): PlacementViolation[] {
  return neighbours.flatMap(({ other, index, sameFeature }): PlacementViolation[] => {
    const needed = requiredGap(piece.piece, other.piece, spacing);
    if (!boundsOverlap(piece.bounds, other.bounds, needed)) {
      return [];
    }
    if (polygonsOverlap(piece.polygon, other.polygon)) {
      return [{ kind: 'overlaps', other: index }];
    }
    const gap = polygonDistance(piece.polygon, other.polygon);
    return sameFeature || isApart(gap, needed)
      ? []
      : [{ kind: 'tooClose', other: index, distance: gap, needed }];
  });
}

/** For each piece, a number it shares with every piece it stands joined to, however indirectly. */
function featureNumbers(pieces: readonly PlacedPiece[], spacing: SpacingRules): number[] {
  const feature = pieces.map((_, i) => i);
  const root = (i: number): number => {
    let r = i;
    while (feature[r] !== r) {
      r = feature[r] ?? r;
    }
    return r;
  };
  pieces.forEach((piece, i) => {
    pieces.slice(i + 1).forEach((other, k) => {
      if (
        boundsOverlap(piece.bounds, other.bounds, spacing.joinGap) &&
        !polygonsOverlap(piece.polygon, other.polygon) &&
        isJoined(polygonDistance(piece.polygon, other.polygon), spacing)
      ) {
        feature[root(i + 1 + k)] = root(i);
      }
    });
  });
  return pieces.map((_, i) => root(i));
}

/** Zones with more pieces fully inside them than allowed, and which pieces those are. */
function crowdedZones(
  pieces: readonly PlacedPiece[],
  deployment: DeploymentMap,
): { player: PlayerId; inside: Set<number> }[] {
  return PLAYERS.flatMap((player) => {
    const inside = new Set(
      pieces.flatMap(({ polygon }, i) =>
        containsPolygon(deployment.zones[player], polygon) ? [i] : [],
      ),
    );
    return inside.size > MAX_PIECES_INSIDE_ZONE ? [{ player, inside }] : [];
  });
}
