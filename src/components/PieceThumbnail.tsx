import type { SharedView } from '../domain/sharedScale';
import type { TerrainPiece } from '../domain/terrain';
import { FootprintShape } from './FootprintShape';
import { InchGrid } from './InchGrid';
import { PiecePhoto } from './PiecePhoto';
import { TERRAIN_STYLES } from './terrainStyles';

interface PieceThumbnailProps {
  piece: TerrainPiece;
  photoUrl: string | undefined;
  /**
   * The area to show, in inches, with a 1″ grid, so pieces drawn with the same view can be
   * compared by size. Without it the piece fills the picture.
   */
  view?: SharedView;
  /** Size and corner classes; a small rounded tile by default. */
  className?: string;
}

/** A small picture of a piece's footprint, with its photo when it has one. */
export function PieceThumbnail({
  piece,
  photoUrl,
  view,
  className = 'h-12 w-16 rounded-lg',
}: PieceThumbnailProps) {
  const style = TERRAIN_STYLES[piece.type];
  const { width, depth } = view ?? fitted(piece);
  return (
    <svg
      viewBox={`${String(-width / 2)} ${String(-depth / 2)} ${String(width)} ${String(depth)}`}
      className={`bg-mat shrink-0 ${className}`}
      aria-hidden="true"
    >
      {view !== undefined && <InchGrid width={width} depth={depth} />}
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

/** Room around the piece in proportion to its size, so small and large pieces sit alike. */
function fitted(piece: TerrainPiece): SharedView {
  const { width, depth } = piece.footprint;
  const margin = Math.max(width, depth) * 0.12;
  return { width: width + 2 * margin, depth: depth + 2 * margin };
}
