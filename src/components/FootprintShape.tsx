import type { SVGProps } from 'react';
import type { Footprint } from '../domain/terrain';

type FootprintShapeProps = { footprint: Footprint } & Omit<
  SVGProps<SVGRectElement & SVGEllipseElement>,
  'x' | 'y' | 'width' | 'height' | 'rx' | 'ry' | 'ref'
>;

/** A footprint centred on the origin, in inches, as a rectangle or an ellipse. */
export function FootprintShape({ footprint, ...props }: FootprintShapeProps) {
  const { width, depth } = footprint;
  return footprint.kind === 'rect' ? (
    <rect x={-width / 2} y={-depth / 2} width={width} height={depth} {...props} />
  ) : (
    <ellipse rx={width / 2} ry={depth / 2} {...props} />
  );
}
