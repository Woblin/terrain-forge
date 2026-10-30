import type { FocusEvent, PointerEvent } from 'react';
import type { Placement, TerrainPiece } from '../domain/terrain';
import { FootprintShape } from './FootprintShape';
import { PiecePhoto } from './PiecePhoto';
import { PIECE_HALO, TERRAIN_STYLES } from './terrainStyles';

interface TerrainShapeProps {
  piece: TerrainPiece;
  placement: Placement;
  label: string;
  selected: boolean;
  hasProblems: boolean;
  photoUrl: string | undefined;
  /** Width of the invisible outline that makes thin pieces easy to grab, in inches. */
  hitWidth: number;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
  onFocus: (event: FocusEvent<SVGGElement>) => void;
}

/** One terrain piece on the board, drawn in inches around its centre. */
export function TerrainShape({
  piece,
  placement,
  label,
  selected,
  hasProblems,
  photoUrl,
  hitWidth,
  onPointerDown,
  onFocus,
}: TerrainShapeProps) {
  const style = TERRAIN_STYLES[piece.type];
  const { position, rotation } = placement;
  return (
    <g
      transform={`translate(${String(position.x)} ${String(position.y)}) rotate(${String(rotation)})`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      onFocus={onFocus}
      className="cursor-grab outline-none active:cursor-grabbing"
    >
      <FootprintShape
        footprint={piece.footprint}
        className="fill-transparent stroke-transparent"
        strokeWidth={hitWidth}
      />
      <FootprintShape
        footprint={piece.footprint}
        className={`fill-none ${PIECE_HALO}`}
        strokeWidth={5}
        vectorEffect="non-scaling-stroke"
      />
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
      {hasProblems && (
        <FootprintShape
          footprint={piece.footprint}
          className="fill-red-500/25 stroke-red-500"
          strokeWidth={3}
          strokeDasharray="5 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {selected && (
        <FootprintShape
          footprint={piece.footprint}
          className="stroke-brass-glow fill-none"
          strokeWidth={3}
          strokeDasharray="7 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}
