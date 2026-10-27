import { useId, type ReactNode } from 'react';

export interface Segment<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  /** Read out instead of the label, for segments that only show an icon or a short label. */
  readonly ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  legend: string;
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** A row of options of which exactly one is picked, built on radio buttons. */
export function SegmentedControl<T extends string>({
  legend,
  segments,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset
      className={`bg-raised flex items-center gap-0.5 rounded-lg p-0.5 text-sm ${className}`}
    >
      <legend className="sr-only">{legend}</legend>
      {segments.map((segment) => (
        <label
          key={segment.value}
          title={segment.ariaLabel}
          className={`has-[:focus-visible]:outline-accent-ink flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1 font-medium has-[:focus-visible]:outline-2 ${segment.value === value ? 'bg-selected text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
        >
          <input
            type="radio"
            name={name}
            value={segment.value}
            checked={segment.value === value}
            aria-label={segment.ariaLabel}
            onChange={() => {
              onChange(segment.value);
            }}
            className="sr-only"
          />
          {segment.label}
        </label>
      ))}
    </fieldset>
  );
}
