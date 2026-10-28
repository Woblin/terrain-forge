import type { Footprint, TerrainType } from '../domain/terrain';
import { formatLength, type LengthUnit } from '../domain/units';
import { FootprintShape } from './FootprintShape';
import { PiecePhoto } from './PiecePhoto';
import { TERRAIN_STYLES } from './terrainStyles';

interface FootprintPreviewProps {
  type: TerrainType;
  footprint: Footprint | null;
  unit: LengthUnit;
  /** The piece's photo, drawn over the footprint when there is one. */
  photoUrl?: string;
}

/** Length of the scale bar under the piece, in inches. */
const RULER = 6;
const MARGIN = 1;
const RULER_SPACE = 2;

/** The piece seen from above, drawn to scale above a 6″ scale bar. */
export function FootprintPreview({ type, footprint, unit, photoUrl }: FootprintPreviewProps) {
  if (footprint === null) {
    return (
      <p className="bg-mat text-muted flex h-32 items-center justify-center rounded-lg px-3 text-center text-sm">
        Enter a width and depth to see the piece to scale.
      </p>
    );
  }
  const style = TERRAIN_STYLES[type];
  const width = Math.max(footprint.width, RULER) + 2 * MARGIN;
  const height = footprint.depth + RULER_SPACE + 2 * MARGIN;
  const rulerY = MARGIN + footprint.depth + RULER_SPACE;
  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        className="bg-mat max-h-48 w-full rounded-lg"
        role="img"
        aria-label={`${style.name}, ${formatLength(footprint.width, unit)} by ${formatLength(footprint.depth, unit)}, drawn to scale`}
      >
        <g transform={`translate(${String(width / 2)} ${String(MARGIN + footprint.depth / 2)})`}>
          <FootprintShape footprint={footprint} className={style.fill} />
          {photoUrl !== undefined && <PiecePhoto footprint={footprint} url={photoUrl} />}
          <FootprintShape
            footprint={footprint}
            className={`fill-none ${style.stroke}`}
            strokeWidth={1.5}
            strokeDasharray={style.dash}
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <g className="stroke-stone-300" strokeWidth={1.5}>
          <line
            x1={MARGIN}
            x2={MARGIN + RULER}
            y1={rulerY}
            y2={rulerY}
            vectorEffect="non-scaling-stroke"
          />
          {Array.from({ length: RULER + 1 }, (_, inch) => (
            <line
              key={inch}
              x1={MARGIN + inch}
              x2={MARGIN + inch}
              y1={rulerY - (inch % 3 === 0 ? 0.5 : 0.25)}
              y2={rulerY}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>
      <figcaption className="text-muted text-xs">
        The bar under the piece is {formatLength(RULER, unit)} long.
      </figcaption>
    </figure>
  );
}
