import type { TerrainPiece } from '../domain/terrain';
import { FootprintShape } from './FootprintShape';
import { PiecePhoto } from './PiecePhoto';
import { TERRAIN_STYLES } from './terrainStyles';

interface PieceThumbnailProps {
  piece: TerrainPiece;
  photoUrl: string | undefined;
}

/** A small picture of a piece's footprint, with its photo when it has one. */
export function PieceThumbnail({ piece, photoUrl }: PieceThumbnailProps) {
  const style = TERRAIN_STYLES[piece.type];
  const { width, depth } = piece.footprint;
  const margin = 0.5;
  return (
    <svg
      viewBox={`${String(-width / 2 - margin)} ${String(-depth / 2 - margin)} ${String(width + 2 * margin)} ${String(depth + 2 * margin)}`}
      className="bg-mat h-12 w-16 shrink-0 rounded-lg"
      aria-hidden="true"
    >
      <FootprintShape footprint={piece.footprint} className={style.fill} />
      {photoUrl !== undefined && <PiecePhoto footprint={piece.footprint} url={photoUrl} />}
      <FootprintShape
        footprint={piece.footprint}
        className={`fill-none ${style.stroke}`}
        strokeWidth={1.5}
        strokeDasharray={style.dash}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
