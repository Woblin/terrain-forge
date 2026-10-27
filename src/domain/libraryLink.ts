import { LIBRARY_LIMITS } from './library';
import { compareIds } from './placement';
import {
  TERRAIN_TYPE_NAMES,
  TERRAIN_TYPES,
  type Footprint,
  type TerrainPiece,
  type TerrainType,
} from './terrain';

const TYPE_CODES: Readonly<Record<TerrainType, string>> = {
  ruin: 'r',
  building: 'b',
  forest: 'f',
  obstacle: 'o',
  hill: 'h',
  crater: 'c',
};

const SHAPE_CODES: Readonly<Record<Footprint['kind'], string>> = { rect: 'r', ellipse: 'e' };

const PIECE_SEPARATOR = '_';
const PIECE_PATTERN = /^([a-z])([a-z])(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+)$/;

/**
 * A short, URL-safe text for a collection, such as `rr12x6x6_fe9x7x2`: type, shape, width,
 * depth and quantity of each piece. Names and photos stay private. The pieces are written in
 * the order the generator sorts them, so the decoded collection gives the same board.
 */
export function encodePieces(pieces: readonly TerrainPiece[]): string {
  return pieces
    .filter((piece) => piece.quantity > 0)
    .sort(compareIds)
    .map(
      (piece) =>
        `${TYPE_CODES[piece.type]}${SHAPE_CODES[piece.footprint.kind]}${String(piece.footprint.width)}x${String(piece.footprint.depth)}x${String(piece.quantity)}`,
    )
    .join(PIECE_SEPARATOR);
}

/**
 * The collection a link carries, or null when the text is not a valid collection. Pieces are
 * named after their type and get ids that keep the encoded order.
 */
export function decodePieces(code: string): TerrainPiece[] | null {
  const parts = code.split(PIECE_SEPARATOR);
  if (parts.length > LIBRARY_LIMITS.maxKinds) {
    return null;
  }
  const pieces = parts.map((part, index) => decodePiece(part, index));
  return pieces.every((piece) => piece !== null) ? pieces : null;
}

function decodePiece(part: string, index: number): TerrainPiece | null {
  const match = PIECE_PATTERN.exec(part);
  if (match === null) {
    return null;
  }
  const [, typeCode, shapeCode, widthText, depthText, quantityText] = match;
  const type = TERRAIN_TYPES.find((candidate) => TYPE_CODES[candidate] === typeCode);
  const kind = shapeCode === 'r' ? 'rect' : shapeCode === 'e' ? 'ellipse' : undefined;
  const width = Number(widthText);
  const depth = Number(depthText);
  const quantity = Number(quantityText);
  if (
    type === undefined ||
    kind === undefined ||
    !withinLimits(width) ||
    !withinLimits(depth) ||
    quantity < LIBRARY_LIMITS.minQuantity ||
    quantity > LIBRARY_LIMITS.maxQuantity
  ) {
    return null;
  }
  return {
    id: `p${String(index).padStart(3, '0')}`,
    name: TERRAIN_TYPE_NAMES[type],
    type,
    footprint: { kind, width, depth },
    quantity,
  };
}

function withinLimits(side: number): boolean {
  return side >= LIBRARY_LIMITS.minSide && side <= LIBRARY_LIMITS.maxSide;
}
