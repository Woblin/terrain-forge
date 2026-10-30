import { PLAYERS, type Board, type DeploymentMap, type PlayerId } from '../domain/board';
import type { Point, Polygon } from '../domain/geometry';
import { innerEdges } from '../domain/zoneEdges';
import { PLAYER_STYLES } from './terrainStyles';

interface DeploymentZonesProps {
  board: Board;
  deployment: DeploymentMap;
  /** The board is drawn turned a quarter turn, so labels turn back to stay readable. */
  upright: boolean;
  /** False to leave out the player names, for pictures too small to read them. */
  labelled: boolean;
}

/** Space between a zone's corner and its label, in inches. */
const LABEL_INSET = 1.2;
const LABEL_SIZE = 1.6;

/**
 * Both players' deployment zones: a soft tint, a dashed line along the side that faces the
 * board, and the player's name in the zone's corner (A top left, B bottom right on screen).
 */
export function DeploymentZones({ board, deployment, upright, labelled }: DeploymentZonesProps) {
  return (
    <g aria-hidden="true" pointerEvents="none">
      {PLAYERS.map((player) => {
        const zone = deployment.zones[player];
        const style = PLAYER_STYLES[player];
        const points = zone.map(({ x, y }) => `${String(x)},${String(y)}`).join(' ');
        return (
          <g key={player}>
            <polygon points={points} className={style.zone} />
            {innerEdges(zone, board).map(([a, b]) => (
              <line
                key={`${String(a.x)},${String(a.y)}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={style.edge}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {labelled && <ZoneLabel player={player} zone={zone} board={board} upright={upright} />}
          </g>
        );
      })}
    </g>
  );
}

interface ZoneLabelProps {
  player: PlayerId;
  zone: Polygon;
  board: Board;
  upright: boolean;
}

function ZoneLabel({ player, zone, board, upright }: ZoneLabelProps) {
  const first = player === 'A';
  const anchor = labelAnchor(zone, board, upright, first);
  return (
    <text
      x={anchor.x}
      y={anchor.y}
      textAnchor={first ? 'start' : 'end'}
      dominantBaseline={first ? 'hanging' : 'auto'}
      fontSize={LABEL_SIZE}
      transform={upright ? `rotate(90 ${String(anchor.x)} ${String(anchor.y)})` : undefined}
      paintOrder="stroke"
      strokeWidth={0.25}
      strokeLinejoin="round"
      className={`${PLAYER_STYLES[player].text} font-display stroke-black/70`}
    >
      Player {player}
    </text>
  );
}

/**
 * Where a zone's label goes, in board inches: just inside the zone's top-left corner as seen on
 * screen, or its bottom-right corner. On an upright board, screen x is board y and screen y is
 * the board's width less board x.
 */
function labelAnchor(zone: Polygon, board: Board, upright: boolean, topLeft: boolean): Point {
  const toScreen = (p: Point): Point => (upright ? { x: p.y, y: board.width - p.x } : p);
  const toBoard = (p: Point): Point => (upright ? { x: board.width - p.y, y: p.x } : p);
  const screen = zone.map(toScreen);
  const xs = screen.map((p) => p.x);
  const ys = screen.map((p) => p.y);
  const corner = topLeft
    ? { x: Math.min(...xs) + LABEL_INSET, y: Math.min(...ys) + LABEL_INSET }
    : { x: Math.max(...xs) - LABEL_INSET, y: Math.max(...ys) - LABEL_INSET };
  return toBoard(corner);
}
