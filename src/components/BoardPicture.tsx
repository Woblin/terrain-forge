import type { GameSetup } from '../domain/gameSetup';
import type { Layout } from '../domain/generator';
import type { TerrainPiece } from '../domain/terrain';
import { DeploymentZones } from './DeploymentZones';
import { FootprintShape } from './FootprintShape';
import { TERRAIN_STYLES } from './terrainStyles';

interface BoardPictureProps {
  setup: GameSetup;
  /** The terrain to draw; just the empty table and zones while it is null. */
  layout: Layout | null;
  pieces: readonly TerrainPiece[];
  /** Width and corner classes; full width by default. */
  className?: string;
  /** False to leave out the player names, for small pictures. */
  labelled?: boolean;
}

/** A board drawn as a picture, with nothing to click: for showing what a layout looks like. */
export function BoardPicture({
  setup,
  layout,
  pieces,
  className = 'w-full',
  labelled = true,
}: BoardPictureProps) {
  const { width, depth } = setup.board;
  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(depth)}`}
      aria-hidden="true"
      className={`bg-mat block h-auto ${className}`}
    >
      <rect width={width} height={depth} className="fill-stone-800" />
      <DeploymentZones deployment={setup.deployment} upright={false} labelled={labelled} />
      <g>
        {layout?.placements.map((placement, index) => {
          const piece = pieces.find((candidate) => candidate.id === placement.pieceId);
          if (piece === undefined) {
            return null;
          }
          const style = TERRAIN_STYLES[piece.type];
          const { x, y } = placement.position;
          return (
            <g
              key={index}
              transform={`translate(${String(x)} ${String(y)}) rotate(${String(placement.rotation)})`}
            >
              <FootprintShape footprint={piece.footprint} className={style.fill} />
              <FootprintShape
                footprint={piece.footprint}
                className={`fill-none ${style.stroke}`}
                strokeWidth={1.5}
                strokeDasharray={style.dash}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
