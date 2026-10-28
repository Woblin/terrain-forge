import { useId, type PointerEvent, type ReactNode, type RefObject } from 'react';
import type { Board } from '../domain/board';
import { uprightTransform, type ScreenSize } from '../domain/boardFit';
import type { Mat } from '../domain/mats';
import { MatTone } from './MatTone';
import { matBackground } from './matPictures';

interface BoardViewProps {
  board: Board;
  /** The ground drawn under everything else. */
  mat: Mat;
  /** The group that holds the board drawing; its screen transform maps pointer positions to inches. */
  frameRef: RefObject<SVGGElement | null>;
  /** Draws the board turned a quarter turn, with Player A on the left, for tall screens. */
  upright: boolean;
  /** The size in pixels the board is drawn at. */
  size: ScreenSize;
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
  mat,
  frameRef,
  upright,
  size,
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
      viewBox={
        upright ? `0 0 ${String(depth)} ${String(width)}` : `0 0 ${String(width)} ${String(depth)}`
      }
      width={size.width}
      height={size.height}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      style={matBackground(mat, board, upright, 'full')}
      className={`bg-mat shadow-shade ring-line block touch-none overflow-hidden rounded-2xl shadow-2xl ring-1 transition-opacity select-none motion-reduce:transition-none ${dimmed ? 'opacity-50' : ''}`}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <title id={titleId}>Battlefield</title>
      <desc id={descriptionId}>{description}</desc>
      <g ref={frameRef} transform={upright ? uprightTransform(board) : undefined}>
        <MatTone mat={mat} board={board} />
        <g
          aria-hidden="true"
          className={mat.tileWidth === null ? 'stroke-stone-700' : 'stroke-white/15'}
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
      </g>
    </svg>
  );
}
