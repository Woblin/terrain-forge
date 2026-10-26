import { PLAYERS, type PlayerId } from '../domain/board';
import { ZONE_SAMPLE_SPACING } from '../domain/fairness';
import type { Point } from '../domain/geometry';
import { PLAYER_STYLES } from './terrainStyles';

interface HiddenAreaOverlayProps {
  hidden: Readonly<Record<PlayerId, readonly Point[]>>;
}

/** The parts of each zone the enemy zone cannot see (R1), shaded square by square. */
export function HiddenAreaOverlay({ hidden }: HiddenAreaOverlayProps) {
  const size = ZONE_SAMPLE_SPACING * 0.9;
  return (
    <g aria-hidden="true" pointerEvents="none">
      {PLAYERS.flatMap((player) =>
        hidden[player].map((point) => (
          <rect
            key={`${player}-${String(point.x)}-${String(point.y)}`}
            x={point.x - size / 2}
            y={point.y - size / 2}
            width={size}
            height={size}
            className={PLAYER_STYLES[player].hidden}
          />
        )),
      )}
    </g>
  );
}
