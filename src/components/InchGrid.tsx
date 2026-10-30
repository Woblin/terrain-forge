interface InchGridProps {
  /** The size of the view the grid fills, in inches, centred on the origin. */
  width: number;
  depth: number;
}

/** Faint lines one inch apart, from the top left corner of the view. */
export function InchGrid({ width, depth }: InchGridProps) {
  const left = -width / 2;
  const top = -depth / 2;
  const columns = Array.from({ length: Math.ceil(width) - 1 }, (_, i) => left + i + 1);
  const rows = Array.from({ length: Math.ceil(depth) - 1 }, (_, i) => top + i + 1);
  return (
    <g className="stroke-white/5" strokeWidth={1}>
      {columns.map((x) => (
        <line
          key={`x${String(x)}`}
          x1={x}
          x2={x}
          y1={top}
          y2={-top}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {rows.map((y) => (
        <line
          key={`y${String(y)}`}
          x1={left}
          x2={-left}
          y1={y}
          y2={y}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
