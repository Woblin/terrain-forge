import type { Range } from '../domain/presets';

interface CoverageBarProps {
  /** Share of the board the collection covers. */
  coverage: number;
  /** The share boards aim for, shaded on the bar. */
  target: Range;
}

/** The bar runs from bare to this share of the board. */
const FULL_SCALE = 0.4;

/** A picture of the coverage against the target; the sentence beside it says the same in words. */
export function CoverageBar({ coverage, target }: CoverageBarProps) {
  const at = (share: number) => `${String(Math.min(share / FULL_SCALE, 1) * 100)}%`;
  return (
    <div
      aria-hidden="true"
      className="bg-switch-off relative h-2 rounded-full shadow-[inset_0_0_0_1px_rgb(42_29_18/0.25)]"
    >
      <span
        className="bg-pass/35 absolute inset-y-0"
        style={{ left: at(target.min), width: `calc(${at(target.max)} - ${at(target.min)})` }}
      />
      <span
        className="bg-ink absolute -top-[3px] -ml-[1.5px] h-3.5 w-[3px] rounded-[1px]"
        style={{ left: at(coverage) }}
      />
    </div>
  );
}
