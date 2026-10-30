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
  /** What it sits on: parchment fills the picked segment seal red, iron fills it brass. */
  tone?: 'parchment' | 'iron';
  /** A short label shown before the segments, as in "Sort  Newest | Name"; the legend is read out. */
  shownLabel?: string;
  className?: string;
}

const TONES = {
  parchment: {
    group: 'border-line-strong bg-field',
    picked: 'bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_220_180/0.25)]',
    idle: 'text-soft hover:text-ink hover:bg-hover',
  },
  iron: {
    group: 'border-iron-line bg-[#1f1810]',
    picked: 'bg-brass-bright text-canvas',
    idle: 'text-on-iron-muted hover:text-on-iron',
  },
} as const;

/** A row of options of which exactly one is picked, built on radio buttons. */
export function SegmentedControl<T extends string>({
  legend,
  segments,
  value,
  onChange,
  tone = 'parchment',
  shownLabel,
  className = '',
}: SegmentedControlProps<T>) {
  const name = useId();
  const look = TONES[tone];
  return (
    <fieldset
      className={`flex items-center gap-0.5 rounded-sm border p-[3px] text-sm ${look.group} ${className}`}
    >
      <legend className="sr-only">{legend}</legend>
      {shownLabel !== undefined && (
        <span aria-hidden="true" className="text-muted pr-2 pl-1.5 text-xs">
          {shownLabel}
        </span>
      )}
      {segments.map((segment) => (
        <label
          key={segment.value}
          title={segment.ariaLabel}
          className={`has-[:focus-visible]:outline-accent-ink flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xs px-2.5 py-0.5 font-semibold has-[:focus-visible]:outline-2 ${segment.value === value ? look.picked : look.idle}`}
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
