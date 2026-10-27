import { useId, type PointerEvent, type ReactNode, type RefObject } from 'react';
import type { Board } from '../domain/board';

interface BoardViewProps {
  board: Board;
  svgRef: RefObject<SVGSVGElement | null>;
  /** A one-line summary of the board for screen readers. */
  description: string;
  dimmed: boolean;
  children: ReactNode;
  onBackgroundPointerDown: () => void;
  onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: () => void;
}

/** Inches between grid lines on the table. */
const GRID_SPACING = 6;

/**
 * The battlefield as an SVG whose user units are inches, so everything inside is drawn straight
 * from board coordinates; only the viewBox turns inches into pixels.
 */
export function BoardView({
  board,
  svgRef,
  description,
  dimmed,
  children,
  onBackgroundPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: BoardViewProps) {
  const titleId = useId();
  const descriptionId = useId();
  const { width, depth } = board;
  const columns = Array.from(
    { length: Math.floor(width / GRID_SPACING) - 1 },
    (_, i) => (i + 1) * GRID_SPACING,
  );
  const rows = Array.from(
    { length: Math.floor(depth / GRID_SPACING) - 1 },
    (_, i) => (i + 1) * GRID_SPACING,
  );
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${String(width)} ${String(depth)}`}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={`bg-mat block h-auto w-full touch-none overflow-hidden rounded-md shadow-lg transition-opacity select-none motion-reduce:transition-none ${dimmed ? 'opacity-50' : ''}`}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <title id={titleId}>Battlefield</title>
      <desc id={descriptionId}>{description}</desc>
      <rect width={width} height={depth} className="fill-stone-800" />
      <g
        aria-hidden="true"
        className="stroke-stone-700"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      >
        {columns.map((x) => (
          <line
            key={`x${String(x)}`}
            x1={x}
            y1={0}
            x2={x}
            y2={depth}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {rows.map((y) => (
          <line
            key={`y${String(y)}`}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      {children}
    </svg>
  );
}
