import type { Board } from './board';

export const MAT_IDS = [
  'plain',
  'grass',
  'rocky-grass',
  'fields',
  'rocky-ground',
  'lava',
  'desert',
  'snow',
] as const;

/** The ground drawn under the terrain. A picture only: the generator never sees it. */
export type MatId = (typeof MAT_IDS)[number];

export const DEFAULT_MAT_ID: MatId = 'plain';

export interface Mat {
  readonly id: MatId;
  readonly name: string;
  /** How wide one repeat of the picture is on the table, in inches; null for the plain board. */
  readonly tileWidth: number | null;
  /** The picture's width divided by its height. */
  readonly aspect: number;
  /**
   * How much the picture is darkened, from 0 to 1, so that pieces, zones and overlays stay as
   * easy to read as on the plain board.
   */
  readonly tone: number;
}

/** The mat pictures are 620 × 413 pixels. */
const PICTURE_ASPECT = 620 / 413;

const PLAIN_MAT: Mat = { id: 'plain', name: 'Plain', tileWidth: null, aspect: 1, tone: 0 };

export const MATS: readonly Mat[] = [
  PLAIN_MAT,
  { id: 'grass', name: 'Grass', tileWidth: 24, aspect: PICTURE_ASPECT, tone: 0.3 },
  { id: 'rocky-grass', name: 'Rocky grass', tileWidth: 24, aspect: PICTURE_ASPECT, tone: 0.45 },
  { id: 'fields', name: 'Fields', tileWidth: 24, aspect: PICTURE_ASPECT, tone: 0.4 },
  { id: 'rocky-ground', name: 'Rocky ground', tileWidth: 24, aspect: PICTURE_ASPECT, tone: 0.35 },
  { id: 'lava', name: 'Lava', tileWidth: 24, aspect: PICTURE_ASPECT, tone: 0.2 },
  { id: 'desert', name: 'Desert', tileWidth: 24, aspect: PICTURE_ASPECT, tone: 0.5 },
  { id: 'snow', name: 'Snow', tileWidth: 24, aspect: PICTURE_ASPECT, tone: 0.6 },
];

export function isMatId(value: unknown): value is MatId {
  return MAT_IDS.some((id) => id === value);
}

/** The mat with this id; an unknown or missing id, such as one from a newer app, is plain. */
export function findMat(id: string | null | undefined): Mat {
  return MATS.find((mat) => mat.id === id) ?? PLAIN_MAT;
}

/** The mat id to use for a stored or linked value: a known id, or plain. */
export function matIdOf(value: unknown): MatId {
  return isMatId(value) ? value : DEFAULT_MAT_ID;
}

/**
 * The CSS background size that repeats the mat at its size in inches, as shares of the drawn
 * board, so it needs no pixels. A board drawn upright swaps its width and depth on screen.
 */
export function matBackgroundSize(mat: Mat, board: Board, upright: boolean): string | null {
  if (mat.tileWidth === null) {
    return null;
  }
  const across = upright ? board.depth : board.width;
  const down = upright ? board.width : board.depth;
  const tileDepth = mat.tileWidth / mat.aspect;
  return `${percent(mat.tileWidth / across)} ${percent(tileDepth / down)}`;
}

function percent(share: number): string {
  return `${String(Math.round(share * 10000) / 100)}%`;
}
