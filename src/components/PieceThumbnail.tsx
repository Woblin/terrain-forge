import type { TerrainPiece } from '../domain/terrain';
import { FootprintShape } from './FootprintShape';
import { PiecePhoto } from './PiecePhoto';
import { TERRAIN_STYLES } from './terrainStyles';

interface PieceThumbnailProps {
  piece: TerrainPiece;
  photoUrl: string | undefined;
  /** Size and corner classes; a small rounded tile by default. */
  className?: string;
}

/** A small picture of a piece's footprint, with its photo when it has one. */
export function PieceThumbnail({
  piece,
  photoUrl,
  className = 'h-12 w-16 rounded-lg',
}: PieceThumbnailProps) {
  const style = TERRAIN_STYLES[piece.type];
  const { width, depth } = piece.footprint;
  // Room around the piece in proportion to its size, so small and large pieces sit alike.
  const margin = Math.max(width, depth) * 0.12;
  return (
    <svg
      viewBox={`${String(-width / 2 - margin)} ${String(-depth / 2 - margin)} ${String(width + 2 * margin)} ${String(depth + 2 * margin)}`}
      className={`bg-mat shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* A photo covers the shape; parts the player hid let the mat show through. */}
      {photoUrl === undefined ? (
        <FootprintShape footprint={piece.footprint} className={style.fill} />
      ) : (
        <PiecePhoto footprint={piece.footprint} url={photoUrl} />
      )}
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
