import desert from '../assets/mats/desert.webp';
import desertSmall from '../assets/mats/desert-small.webp';
import fields from '../assets/mats/fields.webp';
import fieldsSmall from '../assets/mats/fields-small.webp';
import grass from '../assets/mats/grass.webp';
import grassSmall from '../assets/mats/grass-small.webp';
import lava from '../assets/mats/lava.webp';
import lavaSmall from '../assets/mats/lava-small.webp';
import rockyGrass from '../assets/mats/rocky-grass.webp';
import rockyGrassSmall from '../assets/mats/rocky-grass-small.webp';
import rockyGround from '../assets/mats/rocky-ground.webp';
import rockyGroundSmall from '../assets/mats/rocky-ground-small.webp';
import snow from '../assets/mats/snow.webp';
import snowSmall from '../assets/mats/snow-small.webp';
import { matBackgroundSize, type Mat, type MatId } from '../domain/mats';
import type { Board } from '../domain/board';
import type { CSSProperties } from 'react';

interface MatPicture {
  /** For the board. */
  readonly full: string;
  /** About 256 pixels wide, for swatches and board cards. */
  readonly small: string;
}

/** Each mat's picture; the plain board has none. */
const MAT_PICTURES: Readonly<Record<Exclude<MatId, 'plain'>, MatPicture>> = {
  grass: { full: grass, small: grassSmall },
  'rocky-grass': { full: rockyGrass, small: rockyGrassSmall },
  fields: { full: fields, small: fieldsSmall },
  'rocky-ground': { full: rockyGround, small: rockyGroundSmall },
  lava: { full: lava, small: lavaSmall },
  desert: { full: desert, small: desertSmall },
  snow: { full: snow, small: snowSmall },
};

export function matPicture(mat: Mat, size: keyof MatPicture): string | null {
  return mat.id === 'plain' ? null : MAT_PICTURES[mat.id][size];
}

/**
 * The mat as the background of a board's SVG, repeated at its size in inches. The browser
 * paints a background once, so moving pieces does not repaint the picture.
 */
export function matBackground(
  mat: Mat,
  board: Board,
  upright: boolean,
  size: keyof MatPicture,
): CSSProperties | undefined {
  const url = matPicture(mat, size);
  const backgroundSize = matBackgroundSize(mat, board, upright);
  if (url === null || backgroundSize === null) {
    return undefined;
  }
  return { backgroundImage: `url("${url}")`, backgroundSize, backgroundRepeat: 'repeat' };
}
