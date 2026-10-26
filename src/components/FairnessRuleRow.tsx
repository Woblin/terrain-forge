import type { RuleRow } from './fairnessRows';

interface FairnessRuleRowProps {
  row: RuleRow;
  failed: boolean;
}

/** One balance rule: its name and limit, both players' values, and whether it passes. */
export function FairnessRuleRow({ row, failed }: FairnessRuleRowProps) {
  return (
    <tr className="border-t border-stone-700 align-top">
      <th scope="row" className="py-1.5 pr-2 text-left font-normal">
        <span className="text-stone-400">{row.code}</span> {row.name}
        <span className="block text-xs text-stone-400">{row.limit}</span>
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
      <td
        className={`py-1.5 pl-2 text-right whitespace-nowrap ${failed ? 'text-rose-300' : 'text-emerald-300'}`}
      >
        {failed ? '✗ Fail' : '✓ Pass'}
      </td>
    </tr>
  );
}
