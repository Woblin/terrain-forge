import { useId } from 'react';
import type { Footprint } from '../domain/terrain';

interface PiecePhotoProps {
  footprint: Footprint;
  url: string;
}

/** A piece's photo stretched over its footprint, clipped to an oval for round pieces. */
export function PiecePhoto({ footprint, url }: PiecePhotoProps) {
  const clipId = `photo-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { width, depth } = footprint;
  const round = footprint.kind === 'ellipse';
  return (
    <>
      {round && (
        <clipPath id={clipId}>
          <ellipse rx={width / 2} ry={depth / 2} />
        </clipPath>
      )}
      <image
        href={url}
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={depth}
        preserveAspectRatio="none"
        clipPath={round ? `url(#${clipId})` : undefined}
        aria-hidden="true"
        className="pointer-events-none"
      />
    </>
  );
}
