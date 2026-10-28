import { useId } from 'react';
import { PLAYERS, type DeploymentMap } from '../domain/board';
import { centroid } from '../domain/geometry';
import { PLAYER_STYLES } from './terrainStyles';

interface DeploymentZonesProps {
  deployment: DeploymentMap;
  /** The board is drawn turned a quarter turn, so labels turn back to stay readable. */
  upright: boolean;
  /** False to leave out the player names, for pictures too small to read them. */
  labelled: boolean;
}

/** Both players' deployment zones, hatched in different directions and labelled. */
export function DeploymentZones({ deployment, upright, labelled }: DeploymentZonesProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <g aria-hidden="true" pointerEvents="none">
      <defs>
        {PLAYERS.map((player) => (
          <pattern
            key={player}
            id={`${id}-hatch-${player}`}
            width={2}
            height={2}
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${player === 'A' ? '45' : '-45'})`}
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={2}
              className={PLAYER_STYLES[player].hatch}
              strokeWidth={0.3}
            />
          </pattern>
        ))}
      </defs>
      {PLAYERS.map((player) => {
        const zone = deployment.zones[player];
        const points = zone.map(({ x, y }) => `${String(x)},${String(y)}`).join(' ');
        const middle = centroid(zone);
        return (
          <g key={player}>
            <polygon points={points} className={PLAYER_STYLES[player].zone} />
            <polygon points={points} fill={`url(#${id}-hatch-${player})`} />
            <polygon
              points={points}
              className={`fill-none ${PLAYER_STYLES[player].edge}`}
              strokeOpacity={0.7}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            {labelled && (
              <text
                x={middle.x}
                y={middle.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={1.6}
                transform={
                  upright ? `rotate(90 ${String(middle.x)} ${String(middle.y)})` : undefined
                }
                className={`${PLAYER_STYLES[player].text} font-semibold`}
              >
                Player {player}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
