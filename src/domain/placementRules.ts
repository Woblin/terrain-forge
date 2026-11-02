import { PLAYERS, zoneBacks, type Board, type DeploymentMap, type PlayerId } from './board';
import {
  boundsOverlap,
  containsPolygon,
  polygonDistance,
  polygonsOverlap,
  rectangle,
  type Polygon,
} from './geometry';
import type { PlacedGroup, PlacedPiece } from './placedPiece';
import {
  edgeGapAllowed,
  isApart,
  isJoined,
  isOpenTerrain,
  requiredGap,
  type SpacingRules,
} from './spacing';

export interface PlacementRules {
  readonly board: Board;
  readonly deployment: DeploymentMap;
  readonly edgeMargin: number;
  readonly spacing: SpacingRules;
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

/** At most this many pieces may stand fully inside one deployment zone. */
const MAX_PIECES_INSIDE_ZONE = 1;

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
    pieces.every((piece) => wrongEdgeGaps(piece, board, spacing).length === 0) &&
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
      const needed = neededGap(piece, other, spacing);
      return needed === null || isApart(polygonDistance(piece.polygon, other.polygon), needed);
    }),
  );
}

function leavesZonesOpen(pieces: readonly PlacedPiece[], deployment: DeploymentMap): boolean {
  return PLAYERS.every(
    (player) => piecesInsideZone(pieces, deployment.zones[player]).length <= MAX_PIECES_INSIDE_ZONE,
  );
}

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
  const wrong = wrongEdgeGaps(piece, rules.board, rules.spacing);
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
    const needed = neededGap(piece, other, spacing);
    if (needed === null) {
      return [];
    }
    if (polygonsOverlap(piece.polygon, other.polygon)) {
      return [{ kind: 'overlaps', other: index }];
    }
    const distance = polygonDistance(piece.polygon, other.polygon);
    return sameFeature || isApart(distance, needed)
      ? []
      : [{ kind: 'tooClose', other: index, distance, needed }];
  });
}

/** Zones with more pieces fully inside them than allowed, and which pieces those are. */
function crowdedZones(
  pieces: readonly PlacedPiece[],
  deployment: DeploymentMap,
): { player: PlayerId; inside: Set<number> }[] {
  return PLAYERS.flatMap((player) => {
    const inside = new Set(piecesInsideZone(pieces, deployment.zones[player]));
    return inside.size > MAX_PIECES_INSIDE_ZONE ? [{ player, inside }] : [];
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

/** Gaps from the piece's bounds to each table edge: left, right, near, far. */
function boundsEdgeGaps(piece: PlacedPiece, board: Board): number[] {
  const { minX, maxX, minY, maxY } = piece.bounds;
  return [minX, board.width - maxX, minY, board.depth - maxY];
}

/**
 * The edge gaps the game's edge rule forbids; none when the rule is off or the piece is open
 * terrain.
 */
function wrongEdgeGaps(piece: PlacedPiece, board: Board, spacing: SpacingRules): number[] {
  const { edge } = spacing;
  if (edge === null || isOpenTerrain(piece.piece, spacing)) {
    return [];
  }
  return boundsEdgeGaps(piece, board).filter((gap) => !edgeGapAllowed(gap, edge));
}

/**
 * The gap two pieces must leave between them, or null when their bounds are already that far
 * apart, so their outlines need no closer look.
 */
function neededGap(piece: PlacedPiece, other: PlacedPiece, spacing: SpacingRules): number | null {
  const needed = requiredGap(piece.piece, other.piece, spacing);
  return boundsOverlap(piece.bounds, other.bounds, needed) ? needed : null;
}

/** Indexes of the pieces that stand fully inside a zone. */
function piecesInsideZone(pieces: readonly PlacedPiece[], zone: Polygon): number[] {
  const inside: number[] = [];
  pieces.forEach(({ polygon }, i) => {
    if (containsPolygon(zone, polygon)) {
      inside.push(i);
    }
  });
  return inside;
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
