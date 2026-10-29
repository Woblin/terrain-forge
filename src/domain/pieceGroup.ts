import {
  add,
  polygonBounds,
  polygonsOverlap,
  rotate,
  scale,
  subtract,
  type Bounds,
  type Point,
  type Polygon,
} from './geometry';
import { footprintArea, placeFootprint, type TerrainPiece } from './terrain';

/** One piece in a group: where it stands and how it is turned, relative to the group. */
export interface GroupMember {
  readonly piece: TerrainPiece;
  readonly offset: Point;
  readonly rotation: number;
}

/**
 * Pieces that are placed together as one rigid shape: a lone piece, a wall chain or a feature.
 * Offsets and rotations are relative to the group's own centre and turn.
 */
export type PieceGroup = readonly GroupMember[];

export function soloGroup(piece: TerrainPiece): PieceGroup {
  return [{ piece, offset: { x: 0, y: 0 }, rotation: 0 }];
}

export function groupArea(group: PieceGroup): number {
  return group.reduce((sum, member) => sum + footprintArea(member.piece.footprint), 0);
}

export function memberPolygon(member: GroupMember): Polygon {
  return placeFootprint(member.piece.footprint, {
    pieceId: member.piece.id,
    position: member.offset,
    rotation: member.rotation,
  });
}

/** The group's outline box in its own frame. */
export function groupBounds(group: PieceGroup): Bounds {
  return polygonBounds(group.flatMap(memberPolygon));
}

/** The same group turned by `degrees` around its own origin. */
export function turnGroup(group: PieceGroup, degrees: number): PieceGroup {
  return group.map((member) => ({
    ...member,
    offset: rotate(member.offset, degrees),
    rotation: normalizeDegrees(member.rotation + degrees),
  }));
}

/** The same group moved by `shift` in its own frame. */
export function shiftGroup(group: PieceGroup, shift: Point): PieceGroup {
  return group.map((member) => ({ ...member, offset: add(member.offset, shift) }));
}

/** The same group with its origin moved to the middle of its outline box. */
export function centreGroup(group: PieceGroup): PieceGroup {
  const bounds = groupBounds(group);
  const middle = scale({ x: bounds.minX + bounds.maxX, y: bounds.minY + bounds.maxY }, 0.5);
  return shiftGroup(group, subtract({ x: 0, y: 0 }, middle));
}

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Whether any two pieces of the group overlap. */
export function piecesOverlap(group: PieceGroup): boolean {
  const polygons = group.map(memberPolygon);
  return polygons.some((a, i) => polygons.slice(i + 1).some((b) => polygonsOverlap(a, b)));
}
