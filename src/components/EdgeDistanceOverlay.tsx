import type { Board } from '../domain/board';
import type { EdgeGap } from '../domain/edgeDistance';
import { formatTableLength, type LengthUnit } from '../domain/units';

/** The gaps drawn for one piece; a faded piece steps back while another is selected. */
export interface MeasuredPiece {
  readonly key: string;
  readonly gaps: readonly EdgeGap[];
  readonly faded: boolean;
}

interface EdgeDistanceOverlayProps {
  pieces: readonly MeasuredPiece[];
  board: Board;
  unit: LengthUnit;
  /** The board is drawn turned a quarter turn, so labels turn back to stay readable. */
  upright: boolean;
  /** Inches of board per CSS pixel, so labels keep the same size on screen at any zoom. */
  pixelSize: number;
  /** Label text size in CSS pixels. */
  fontPixels: number;
}

/** A label's size and room, in screen pixels. */
const CHAR_WIDTH = 0.62;
const CHIP_PADDING = 6;
const CHIP_HEIGHT = 1.7;
const CHIP_GAP = 3;

/** Dashed lines from each piece to the board edges, with the distance on each. */
export function EdgeDistanceOverlay({
  pieces,
  board,
  unit,
  upright,
  pixelSize,
  fontPixels,
}: EdgeDistanceOverlayProps) {
  return (
    <g aria-hidden="true" pointerEvents="none">
      {pieces.map((piece) => (
        <g key={piece.key} opacity={piece.faded ? 0.35 : 1}>
          {piece.gaps.map((gap) => (
            <GapMark
              key={gap.edge}
              gap={gap}
              board={board}
              text={formatTableLength(gap.inches, unit)}
              upright={upright}
              pixelSize={pixelSize}
              fontPixels={fontPixels}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

interface GapMarkProps {
  gap: EdgeGap;
  board: Board;
  text: string;
  upright: boolean;
  pixelSize: number;
  fontPixels: number;
}

function GapMark({ gap, board, text, upright, pixelSize, fontPixels }: GapMarkProps) {
  const { from, to } = gap;
  const fontSize = fontPixels * pixelSize;
  const chipWidth = (text.length * CHAR_WIDTH * fontPixels + 2 * CHIP_PADDING) * pixelSize;
  const chipHeight = CHIP_HEIGHT * fontSize;
  const centre = chipCentre(gap, board, upright, pixelSize, chipWidth, chipHeight);
  return (
    <g>
      <line
        x1={to.x}
        y1={to.y}
        x2={from.x}
        y2={from.y}
        className="stroke-orange-200"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={from.x} cy={from.y} r={2.5 * pixelSize} className="fill-orange-200" />
      <g
        transform={`translate(${String(centre.x)} ${String(centre.y)})${upright ? ' rotate(90)' : ''}`}
      >
        <rect
          x={-chipWidth / 2}
          y={-chipHeight / 2}
          width={chipWidth}
          height={chipHeight}
          rx={chipHeight / 3}
          className="fill-stone-950/85 stroke-orange-200"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          className="fill-orange-50 font-semibold tabular-nums"
        >
          {text}
        </text>
      </g>
    </g>
  );
}

/**
 * Where a label sits: in the middle of its line, or beside the line when the line is too short
 * to hold it. It never hangs over the board edge.
 */
function chipCentre(
  gap: EdgeGap,
  board: Board,
  upright: boolean,
  pixelSize: number,
  chipWidth: number,
  chipHeight: number,
) {
  const alongX = gap.edge === 'left' || gap.edge === 'right';
  // The label is drawn level on screen, so which of its sides lies along the line depends on
  // whether the line runs across the screen or up it.
  const acrossScreen = alongX !== upright;
  const along = acrossScreen ? chipWidth : chipHeight;
  const beside = acrossScreen ? chipHeight : chipWidth;
  const middle = { x: (gap.from.x + gap.to.x) / 2, y: (gap.from.y + gap.to.y) / 2 };
  const fits = gap.inches >= along + 2 * CHIP_GAP * pixelSize;
  const shift = fits ? 0 : beside / 2 + CHIP_GAP * pixelSize + 2.5 * pixelSize;
  const size = alongX ? board.width : board.depth;
  const position = clamp(alongX ? middle.x : middle.y, along / 2, size - along / 2);
  return alongX ? { x: position, y: middle.y - shift } : { x: middle.x + shift, y: position };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}
