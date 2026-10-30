import type { RuleId } from '../domain/fairness';
import { RULE_NAMES, type RuleRow } from './fairnessRows';
import { Switch } from './Switch';

interface FairnessRuleRowProps {
  rule: RuleId;
  /** The board's values and the limit, or null before there is a board. */
  row: RuleRow | null;
  /** Whether the next board must pass this rule. */
  chosen: boolean;
  onChosenChange: (chosen: boolean) => void;
  failed: boolean;
  /** The board on show was measured without this rule: still measured, but it cannot fail. */
  off: boolean;
}

/**
 * One balance rule: a switch for the next board, then whether the board on show passes it,
 * its limit and both players' values.
 */
export function FairnessRuleRow({
  rule,
  row,
  chosen,
  onChosenChange,
  failed,
  off,
}: FairnessRuleRowProps) {
  const { code, name } = RULE_NAMES[rule];
  return (
    <li className={`border-line border-b py-2 ${off ? 'text-faint' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <Switch checked={chosen} onChange={onChosenChange}>
            <span className={`font-display ${off ? '' : 'text-accent-ink'}`}>{code}</span> {name}
          </Switch>
        </div>
        {row !== null && (
          <span className={`shrink-0 font-bold ${resultColour(failed, off)}`}>
            {resultLabel(failed, off)}
          </span>
        )}
      </div>
      {row !== null && (
        <div className="flex items-baseline justify-between gap-2.5 pl-12 text-sm tabular-nums">
          <span className="text-muted italic">{row.limit}</span>
          <span className="whitespace-pre">{valuesText(row.values)}</span>
        </div>
      )}
    </li>
  );
}

function valuesText(values: RuleRow['values']): string {
  return typeof values === 'string' ? `Board ${values}` : `A ${values[0]}   B ${values[1]}`;
}

function resultLabel(failed: boolean, off: boolean): string {
  if (off) {
    return 'Off';
  }
  return failed ? '✗ Fail' : '✓ Pass';
}

function resultColour(failed: boolean, off: boolean): string {
  if (off) {
    return 'text-faint';
  }
  return failed ? 'text-fail' : 'text-pass';
}
