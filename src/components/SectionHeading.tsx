import type { ReactNode } from 'react';

interface SectionHeadingProps {
  children: ReactNode;
  /** The heading level; a third-level heading by default. */
  as?: 'h2' | 'h3' | 'span';
  id?: string;
  className?: string;
}

/** A section title in red display type, followed by a brass hairline that ends in a diamond. */
export function SectionHeading({
  children,
  as: Tag = 'h3',
  id,
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Tag id={id} className="font-display text-accent-ink m-0 text-lg whitespace-nowrap">
        {children}
      </Tag>
      <svg
        height="8"
        viewBox="0 0 120 8"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="min-w-5 flex-1"
      >
        <path
          d="M0 4H112"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className="stroke-brass"
        />
        <path d="M116 0.5 119.5 4 116 7.5 112.5 4Z" className="fill-brass" />
      </svg>
    </div>
  );
}
