import type { RuleRow } from './fairnessRows';

interface FairnessRuleRowProps {
  row: RuleRow;
  failed: boolean;
  /** The rule is switched off: still measured, but it cannot fail the board. */
  off: boolean;
}

/** One balance rule: its name and limit, both players' values, and whether it passes. */
export function FairnessRuleRow({ row, failed, off }: FairnessRuleRowProps) {
  return (
    <tr className={`border-line border-t align-top ${off ? 'text-faint' : ''}`}>
      <th scope="row" className="py-1.5 pr-2 text-left font-normal">
        <span className="text-muted">{row.code}</span> {row.name}
        <span className="text-muted block text-xs">{row.limit}</span>
      </th>
      {typeof row.values === 'string' ? (
        <td colSpan={2} className="py-1.5 text-right whitespace-nowrap tabular-nums">
          {row.values}
        </td>
      ) : (
        <>
          <td className="py-1.5 pl-2 text-right whitespace-nowrap tabular-nums">{row.values[0]}</td>
          <td className="py-1.5 pl-2 text-right whitespace-nowrap tabular-nums">{row.values[1]}</td>
        </>
      )}
      <td className={`py-1.5 pl-2 text-right whitespace-nowrap ${resultColour(failed, off)}`}>
        {resultLabel(failed, off)}
      </td>
    </tr>
  );
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
