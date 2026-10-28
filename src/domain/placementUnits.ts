import { attach, canAccompany, drawAttachment } from './features';
import { centreGroup, soloGroup, type PieceGroup } from './pieceGroup';
import { pairPieces, unitArea, type PiecePairing, type PlacementUnit } from './placement';
import { pick, shuffle, type RandomSource } from './random';
import type { SpacingRules } from './spacing';
import type { TerrainPiece, TerrainType } from './terrain';
import { chainLengths, drawChainTurns, isChainable, wallChain } from './wallChains';

/** Chance that a piece that could stand next to an anchor joins one. */
const JOIN_CHANCE = 0.8;
/** Spots against an anchor tried before a companion stays on its own. */
const ATTACH_ATTEMPTS = 8;

/**
 * Turns the pieces, in the order given, into what the generator places: matching pairs, wall
 * chains and features made of an anchor with a companion or two. Largest units come first, since
 * they are the hardest to fit once the board fills up.
 */
export function buildUnits(
  pieces: readonly TerrainPiece[],
  spacing: SpacingRules,
  random: RandomSource,
): PlacementUnit[] {
  const lone = pairPieces(pieces.filter((piece) => !isChainable(piece))).map(pairingUnit);
  const chains = wallUnits(pieces.filter(isChainable), random);
  return largestFirst(withFeatures(largestFirst([...lone, ...chains]), spacing, random));
}

/**
 * Puts first the units that make up the target area, taking each kind of terrain in turn so that
 * every kind gets onto the board, then the rest in case some find no spot. Each part comes
 * largest first.
 */
export function orderForTarget(
  units: readonly PlacementUnit[],
  target: number,
  random: RandomSource,
): PlacementUnit[] {
  const queues = [...unitsByKind(shuffle(random, units)).values()];
  const chosen = new Set<PlacementUnit>();
  let total = 0;
  while (total < target && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const unit = queue.shift();
      if (unit !== undefined && total < target) {
        chosen.add(unit);
        total += unitArea(unit);
      }
    }
  }
  const rest = units.filter((unit) => !chosen.has(unit));
  return [...largestFirst([...chosen]), ...largestFirst(rest)];
}

/** Units by the kind of their main piece, in the order the kinds first appear. */
function unitsByKind(units: readonly PlacementUnit[]): Map<TerrainType, PlacementUnit[]> {
  const byKind = new Map<TerrainType, PlacementUnit[]>();
  for (const unit of units) {
    const kind = unit.groups[0][0]?.piece.type;
    if (kind !== undefined) {
      byKind.set(kind, [...(byKind.get(kind) ?? []), unit]);
    }
  }
  return byKind;
}

function largestFirst(units: readonly PlacementUnit[]): PlacementUnit[] {
  return [...units].sort((a, b) => unitArea(b) - unitArea(a));
}

function pairingUnit(pairing: PiecePairing): PlacementUnit {
  return pairing.kind === 'pair'
    ? { groups: [soloGroup(pairing.pieces[0]), soloGroup(pairing.pieces[1])], parts: [] }
    : { groups: [soloGroup(pairing.piece)], parts: [] };
}

/**
 * Walls of each kind split evenly between the two sides into chains of 1 to 3, each chain with a
 * mirrored twin. With an odd number, the last wall stands alone near the centre line.
 */
function wallUnits(walls: readonly TerrainPiece[], random: RandomSource): PlacementUnit[] {
  const byKind = new Map<string, TerrainPiece[]>();
  for (const wall of walls) {
    byKind.set(wall.id, [...(byKind.get(wall.id) ?? []), wall]);
  }
  return [...byKind.values()].flatMap(([wall, ...rest]) => {
    if (wall === undefined) {
      return [];
    }
    const count = rest.length + 1;
    const paired = chainLengths(Math.floor(count / 2), random).map((length) =>
      chainUnit(wall, drawChainTurns(length, random), true),
    );
    return count % 2 === 1 ? [...paired, chainUnit(wall, [], false)] : paired;
  });
}

/** A chain and, when it finds no spot, the two shorter chains it breaks into. */
function chainUnit(wall: TerrainPiece, turns: readonly number[], paired: boolean): PlacementUnit {
  const chain = wallChain(wall, turns);
  const parts =
    turns.length === 0
      ? []
      : [chainUnit(wall, turns.slice(0, -1), paired), chainUnit(wall, [], paired)];
  return { groups: paired ? [chain, chain] : [chain], parts };
}

/** A unit while features are built: its groups with the anchor still unturned at the origin. */
interface Draft {
  unit: PlacementUnit;
  groups: readonly PieceGroup[];
  sides: number[];
  joined: boolean;
}

/**
 * From the smallest unit up, each joins a larger anchor it suits by chance, if one has room. A
 * pair joins a pair, so both twins get a matching companion; a single joins a single.
 */
function withFeatures(
  units: readonly PlacementUnit[],
  spacing: SpacingRules,
  random: RandomSource,
): PlacementUnit[] {
  const drafts: Draft[] = units.map((unit) => ({
    unit,
    groups: unit.groups,
    sides: [],
    joined: false,
  }));
  for (const companion of [...drafts].reverse()) {
    if (random() < JOIN_CHANCE && companion.sides.length === 0) {
      const anchors = drafts.filter((anchor) => suits(anchor, companion));
      if (anchors.length > 0) {
        joinAnchor(pick(random, anchors), companion, spacing, random);
      }
    }
  }
  return drafts.filter((draft) => !draft.joined).map((draft) => draft.unit);
}

function suits(anchor: Draft, companion: Draft): boolean {
  return (
    anchor !== companion &&
    !anchor.joined &&
    anchor.groups.length === companion.groups.length &&
    anchor.groups.every((group, i) => {
      const other = companion.groups[i];
      return other !== undefined && canAccompany(group, other, anchor.sides.length);
    })
  );
}

function joinAnchor(
  anchor: Draft,
  companion: Draft,
  spacing: SpacingRules,
  random: RandomSource,
): void {
  for (let attempt = 0; attempt < ATTACH_ATTEMPTS; attempt++) {
    const attachment = drawAttachment(random, spacing, anchor.sides);
    const grown = anchor.groups.map((group, i) => {
      const other = companion.groups[i];
      return other === undefined ? null : attach(group, other, attachment, spacing);
    });
    if (grown.every((group) => group !== null)) {
      anchor.unit = featureUnit(grown, [anchor.unit, companion.unit]);
      anchor.groups = grown;
      anchor.sides.push(attachment.side);
      companion.joined = true;
      return;
    }
  }
}

function featureUnit(
  groups: readonly PieceGroup[],
  parts: readonly PlacementUnit[],
): PlacementUnit {
  const [first, second] = groups.map(centreGroup);
  if (first === undefined) {
    throw new Error('A feature needs at least one group.');
  }
  return { groups: second === undefined ? [first] : [first, second], parts };
}
