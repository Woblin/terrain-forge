import {
  boardCentre,
  boardPolygon,
  mirrorPoint,
  PLAYERS,
  type Board,
  type DeploymentMap,
} from './board';
import {
  add,
  boundsOverlap,
  centroid,
  clipLine,
  containsPolygon,
  polygonBounds,
  polygonDistance,
  rectangle,
  scale,
  subtract,
  type Bounds,
  type Point,
  type Polygon,
} from './geometry';
import { randomBetween, randomInt, type RandomSource } from './random';
import { footprintArea, placeFootprint, type Placement, type TerrainPiece } from './terrain';

/** Two matching pieces placed as mirror images, or one piece placed near the centre line. */
export type PlacementUnit =
  | { readonly kind: 'pair'; readonly pieces: readonly [TerrainPiece, TerrainPiece] }
  | { readonly kind: 'single'; readonly piece: TerrainPiece };

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
  readonly minGap: number;
}

/** Footprint areas that differ by at most this share of the larger one can form a pair. */
const PAIR_AREA_TOLERANCE = 0.2;
const ATTEMPTS_PER_UNIT = 150;
const ROTATION_STEP = 15;
/** At most this many pieces may stand fully inside one deployment zone. */
const MAX_PIECES_INSIDE_ZONE = 1;

/** One entry per physical piece, sorted by id so the order never depends on the input. */
export function expandCollection(pieces: readonly TerrainPiece[]): TerrainPiece[] {
  return [...pieces]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .flatMap((piece) => Array.from({ length: piece.quantity }, () => piece));
}

export function canPair(a: TerrainPiece, b: TerrainPiece): boolean {
  const areaA = footprintArea(a.footprint);
  const areaB = footprintArea(b.footprint);
  return (
    a.type === b.type && Math.abs(areaA - areaB) <= PAIR_AREA_TOLERANCE * Math.max(areaA, areaB)
  );
}

/**
 * Pairs each piece with the first later piece it can pair with, then orders the units largest
 * first, since big pieces are the hardest to fit once the board fills up. Equal sizes keep their
 * input order.
 */
export function pairPieces(pieces: readonly TerrainPiece[]): PlacementUnit[] {
  const used = new Set<number>();
  const units: PlacementUnit[] = [];
  pieces.forEach((piece, i) => {
    if (used.has(i)) {
      return;
    }
    used.add(i);
    const partner = pieces.findIndex((other, j) => !used.has(j) && canPair(piece, other));
    const other = pieces[partner];
    if (other === undefined) {
      units.push({ kind: 'single', piece });
    } else {
      used.add(partner);
      units.push({ kind: 'pair', pieces: [piece, other] });
    }
  });
  return units.sort((a, b) => unitArea(b) - unitArea(a));
}

export function unitArea(unit: PlacementUnit): number {
  return unit.kind === 'pair'
    ? unit.pieces.reduce((sum, piece) => sum + footprintArea(piece.footprint), 0)
    : footprintArea(unit.piece.footprint);
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
 * best of up to `spots` legal spots.
 */
export interface SpotChoice {
  readonly spots: number;
  readonly rank: SpotRanker;
}

/**
 * Places units in order until the target area is reached. A unit that would pass the maximum, or
 * that finds no legal spot, is skipped and the next one is tried.
 */
export function placeUnits(
  units: readonly PlacementUnit[],
  area: AreaTarget,
  rules: PlacementRules,
  random: RandomSource,
  choice?: SpotChoice,
): PlacedPiece[] {
  const placed: PlacedPiece[] = [];
  let total = 0;
  for (const unit of units) {
    if (total >= area.target) {
      break;
    }
    const size = unitArea(unit);
    const pieces = total + size <= area.max ? placeUnit(unit, placed, rules, random, choice) : null;
    if (pieces !== null) {
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
  choice?: SpotChoice,
): PlacedPiece[] | null {
  let best: PlacedPiece[] | null = null;
  let bestRank = Infinity;
  let legalSpots = 0;
  for (let attempt = 0; attempt < ATTEMPTS_PER_UNIT; attempt++) {
    const candidate =
      unit.kind === 'pair'
        ? placePair(unit.pieces, rules.board, random)
        : [placeSingle(unit.piece, rules, random)];
    if (isLegal(candidate, placed, rules)) {
      if (choice === undefined) {
        return candidate;
      }
      const rank = choice.rank(candidate, placed);
      if (rank < bestRank) {
        best = candidate;
        bestRank = rank;
      }
      legalSpots++;
      if (bestRank === 0 || legalSpots >= choice.spots) {
        break;
      }
    }
  }
  return best;
}

/** The first piece anywhere it could fit, the second mirrored through the board centre. */
function placePair(
  [first, second]: readonly [TerrainPiece, TerrainPiece],
  board: Board,
  random: RandomSource,
): PlacedPiece[] {
  // However it is rotated, the centre is at least half the shorter side from the edge.
  const inset = Math.min(first.footprint.width, first.footprint.depth) / 2;
  const position = {
    x: randomBetween(random, inset, board.width - inset),
    y: randomBetween(random, inset, board.depth - inset),
  };
  const rotation = randomRotation(random);
  return [
    placed(first, position, rotation),
    placed(second, mirrorPoint(position, board), (rotation + 180) % 360),
  ];
}

/** Somewhere on the line halfway between the two zones, where it favours neither player. */
function placeSingle(
  piece: TerrainPiece,
  rules: PlacementRules,
  random: RandomSource,
): PlacedPiece {
  const centre = boardCentre(rules.board);
  const direction = centreLineDirection(rules.deployment);
  const span = clipLine(boardPolygon(rules.board), centre, direction);
  const along = span === null ? 0 : randomBetween(random, span.start, span.end);
  return placed(piece, add(centre, scale(direction, along)), randomRotation(random));
}

/** Unit vector along the line that is equally far from both zones. */
function centreLineDirection(deployment: DeploymentMap): Point {
  const between = subtract(centroid(deployment.zones.B), centroid(deployment.zones.A));
  const length = Math.hypot(between.x, between.y);
  return { x: -between.y / length, y: between.x / length };
}

function randomRotation(random: RandomSource): number {
  return randomInt(random, 0, 360 / ROTATION_STEP - 1) * ROTATION_STEP;
}

function placed(piece: TerrainPiece, position: Point, rotation: number): PlacedPiece {
  const placement = { pieceId: piece.id, position, rotation };
  const polygon = placeFootprint(piece.footprint, placement);
  return { piece, placement, polygon, bounds: polygonBounds(polygon) };
}

/** Hard rules: on the board, apart from every other piece, and not crowding a zone. */
export function isLegal(
  candidate: readonly PlacedPiece[],
  placed: readonly PlacedPiece[],
  rules: PlacementRules,
): boolean {
  const { board, edgeMargin, minGap } = rules;
  const playable = rectangle(
    edgeMargin,
    edgeMargin,
    board.width - edgeMargin,
    board.depth - edgeMargin,
  );
  const onBoard = candidate.every(({ polygon }) => containsPolygon(playable, polygon));
  return (
    onBoard &&
    keepsApart(candidate, placed, minGap) &&
    leavesZonesOpen([...placed, ...candidate], rules.deployment)
  );
}

function keepsApart(
  candidate: readonly PlacedPiece[],
  placed: readonly PlacedPiece[],
  minGap: number,
): boolean {
  return candidate.every((piece, i) =>
    [...placed, ...candidate.slice(i + 1)].every(
      (other) =>
        !boundsOverlap(piece.bounds, other.bounds, minGap) ||
        polygonDistance(piece.polygon, other.polygon) >= minGap,
    ),
  );
}

function leavesZonesOpen(pieces: readonly PlacedPiece[], deployment: DeploymentMap): boolean {
  return PLAYERS.every(
    (player) =>
      pieces.filter(({ polygon }) => containsPolygon(deployment.zones[player], polygon)).length <=
      MAX_PIECES_INSIDE_ZONE,
  );
}
