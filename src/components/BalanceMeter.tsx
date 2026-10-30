import { readBalance, type BalanceGrade } from '../domain/balanceMeter';
import type { RuleId } from '../domain/fairness';

interface BalanceMeterProps {
  imbalance: number;
  /** The rules the board was measured against; R1 to R4 add to the score. */
  enabledRules: readonly RuleId[];
}

const GRADE_COLOURS: Readonly<Record<BalanceGrade, string>> = {
  'Nearly even': 'text-pass',
  'Slightly uneven': 'text-pass',
  Uneven: 'text-warn-ink',
  'Close to the limit': 'text-fail',
};

/** How alike the two sides are, as a marker on a bar from equal sides to barely fair. */
export function BalanceMeter({ imbalance, enabledRules }: BalanceMeterProps) {
  const reading = readBalance(imbalance, enabledRules);
  if (reading === null) {
    return null;
  }
  const percent = Math.round(reading.position * 100);
  return (
    <section
      aria-labelledby="balance-meter-heading"
      className="border-line bg-tint flex flex-col gap-1.5 rounded-[3px] border px-3 py-2.5"
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <h3 id="balance-meter-heading" className="font-display text-base">
          How even is this board?
        </h3>
        <span className={`font-bold ${GRADE_COLOURS[reading.grade]}`}>{reading.grade}</span>
      </div>
      <div
        role="meter"
        aria-labelledby="balance-meter-heading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${reading.grade}, ${String(percent)}% of the way to barely fair`}
        className="relative my-1 h-2 rounded-full bg-linear-to-r from-[#4f8a45] via-[#c9a352] via-55% to-[#a3261b] shadow-[inset_0_0_0_1px_rgb(42_29_18/0.3)]"
      >
        <span
          className="absolute top-1/2 -mt-[7px] -ml-[7px] size-3.5 rounded-full bg-[#f8f0db] shadow-[0_0_0_2px_#2a1d12,0_1px_3px_rgb(0_0_0/0.4)]"
          style={{ left: `${String(percent)}%` }}
        />
      </div>
      <div aria-hidden="true" className="text-muted flex justify-between text-[13px] italic">
        <span>Both sides equal</span>
        <span>Barely fair</span>
      </div>
      <p className="text-muted text-sm text-pretty">
        Compares what each player gets: cover, hiding spots and terrain on their half. Further left
        means the two sides are more alike.
      </p>
      <p className="text-faint text-xs">Score {imbalance.toFixed(2)} (0 is identical sides)</p>
    </section>
  );
}
