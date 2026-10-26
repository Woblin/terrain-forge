import type { PointerEvent } from 'react';
import { add, rotate, type Point } from '../domain/geometry';

interface RotateHandleProps {
  /** The centre of the selected piece, in inches. */
  center: Point;
  rotation: number;
  /** How far from the centre the handle sits, in inches. */
  reach: number;
  /** Radius of the handle, in inches. */
  radius: number;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
}

/** A round handle beside the selected piece; dragging it turns the piece around its centre. */
export function RotateHandle({
  center,
  rotation,
  reach,
  radius,
  onPointerDown,
}: RotateHandleProps) {
  const handle = add(center, rotate({ x: 0, y: -reach }, rotation));
  return (
    <g onPointerDown={onPointerDown} className="cursor-alias" aria-hidden="true">
      <line
        x1={center.x}
        y1={center.y}
        x2={handle.x}
        y2={handle.y}
        className="stroke-yellow-300"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <circle
        cx={handle.x}
        cy={handle.y}
        r={radius}
        className="fill-yellow-300 stroke-stone-900"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <title>Drag to turn</title>
    </g>
  );
}
