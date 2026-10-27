import type { RuleId } from '../domain/fairness';
import { RULE_ADVICE } from '../domain/generator';

interface ClosestBoardNoteProps {
  failedRules: readonly RuleId[];
}

/**
 * Says that the terrain could not meet every rule, so the generator showed its closest board,
 * and what would help.
 */
export function ClosestBoardNote({ failedRules }: ClosestBoardNoteProps) {
  return (
    <div className="space-y-1 rounded border border-amber-400/50 bg-amber-950/50 p-3 text-sm text-amber-100">
      <p>
        Your terrain could not meet every rule that is on, so this is the closest board the
        generator found.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {failedRules.map((rule) => (
          <li key={rule}>{RULE_ADVICE[rule]}</li>
        ))}
      </ul>
    </div>
  );
}
