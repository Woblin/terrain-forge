import type { Lane } from '../domain/lineOfSight';
import { formatLength, type LengthUnit } from '../domain/units';

interface LaneOverlayProps {
  lane: Lane;
  limit: number;
  unit: LengthUnit;
}

/** The longest clear firing lane (R5) as a line with its length. */
export function LaneOverlay({ lane, limit, unit }: LaneOverlayProps) {
  const tooLong = lane.length > limit;
  const colour = tooLong ? 'stroke-rose-400 fill-rose-400' : 'stroke-sky-300 fill-sky-300';
  const middle = { x: (lane.from.x + lane.to.x) / 2, y: (lane.from.y + lane.to.y) / 2 };
  return (
    <g aria-hidden="true" pointerEvents="none" className={colour}>
      <line
        x1={lane.from.x}
        y1={lane.from.y}
        x2={lane.to.x}
        y2={lane.to.y}
        strokeWidth={2.5}
        strokeDasharray="8 4"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lane.from.x} cy={lane.from.y} r={0.5} />
      <circle cx={lane.to.x} cy={lane.to.y} r={0.5} />
      <text
        x={middle.x}
        y={middle.y - 0.8}
        textAnchor="middle"
        fontSize={1.4}
        strokeWidth={0.4}
        strokeLinejoin="round"
        className="stroke-stone-900 font-semibold"
        paintOrder="stroke"
      >
        {formatLength(lane.length, unit)} clear lane
      </text>
    </g>
  );
}
