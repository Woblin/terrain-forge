import { add, rotate, subtract, type Point } from './geometry';
import { centreGroup, normalizeDegrees, type GroupMember, type PieceGroup } from './pieceGroup';
import { randomInt, type RandomSource } from './random';
import type { TerrainPiece } from './terrain';

export const MAX_CHAIN_LENGTH = 3;
/** How often a chain gets each length, while that many walls are left. */
const LENGTH_ODDS: readonly (readonly [number, number])[] = [
  [1, 0.2],
  [2, 0.45],
  [3, 0.35],
];
const STRAIGHT_CHANCE = 0.5;
const TURN_STEP = 15;
const MAX_TURN = 90;
/** Walls stand this far apart end to end, so they touch without overlapping. */
const JOINT_GAP = 0.01;

/** Rectangular walls join end to end into chains; any other piece stands on its own. */
export function isChainable(piece: TerrainPiece): boolean {
  return piece.type === 'wall' && piece.footprint.kind === 'rect';
}

/** Splits a number of walls into chain lengths of 1 to 3, drawn at random. */
export function chainLengths(count: number, random: RandomSource): number[] {
  const lengths: number[] = [];
  let left = count;
  while (left > 0) {
    const length = Math.min(drawLength(random), left);
    lengths.push(length);
    left -= length;
  }
  return lengths;
}

function drawLength(random: RandomSource): number {
  let roll = random();
  for (const [length, odds] of LENGTH_ODDS) {
    if (roll < odds) {
      return length;
    }
    roll -= odds;
  }
  return MAX_CHAIN_LENGTH;
}

/** The turn at one joint, counter-clockwise positive: straight on, or 15 to 90 degrees either way. */
export function drawTurn(random: RandomSource): number {
  if (random() < STRAIGHT_CHANCE) {
    return 0;
  }
  const size = randomInt(random, 1, MAX_TURN / TURN_STEP) * TURN_STEP;
  return random() < 0.5 ? size : -size;
}

/** The turns at the joints of a chain of `length` walls. */
export function drawChainTurns(length: number, random: RandomSource): number[] {
  return Array.from({ length: length - 1 }, () => drawTurn(random));
}

/**
 * Copies of the wall end to end, one more than there are turns, turning by `turns[i]` after
 * wall i. At a bend the inner corners meet, which leaves a small wedge on the outside.
 */
export function wallChain(piece: TerrainPiece, turns: readonly number[]): PieceGroup {
  const { length, thickness, baseRotation } = wallShape(piece);
  const members: GroupMember[] = [];
  let start: Point = { x: 0, y: 0 };
  let heading = 0;
  for (const turn of [...turns, null]) {
    const centre = add(start, rotate({ x: length / 2, y: 0 }, heading));
    members.push({ piece, offset: centre, rotation: normalizeDegrees(heading + baseRotation) });
    if (turn !== null) {
      start = nextStart(add(start, rotate({ x: length, y: 0 }, heading)), heading, turn, thickness);
      heading += turn;
    }
  }
  return centreGroup(members);
}

/** Where the next wall starts, so its inner corner meets this wall's inner corner. */
function nextStart(end: Point, heading: number, turn: number, thickness: number): Point {
  const side = { x: 0, y: (Math.sign(turn) * thickness) / 2 };
  const corner = add(end, rotate(side, heading));
  const next = heading + turn;
  return add(subtract(corner, rotate(side, next)), rotate({ x: JOINT_GAP, y: 0 }, next));
}

/** The wall's long side, short side, and the turn that lays its long side along the chain. */
function wallShape(piece: TerrainPiece): {
  length: number;
  thickness: number;
  baseRotation: number;
} {
  const { width, depth } = piece.footprint;
  return width >= depth
    ? { length: width, thickness: depth, baseRotation: 0 }
    : { length: depth, thickness: width, baseRotation: 90 };
}
