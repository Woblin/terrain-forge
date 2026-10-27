import { Link } from 'react-router';
import type { CheckLevel, PresetCheck } from '../domain/collectionCheck';
import { formatLength, type LengthUnit } from '../domain/units';

interface CollectionCheckRowProps {
  check: PresetCheck;
  unit: LengthUnit;
}

const LEVELS: Readonly<Record<CheckLevel, { label: string; className: string }>> = {
  ok: { label: '✓ Ready', className: 'bg-green-900/60 text-green-200' },
  warning: { label: '! Worth a look', className: 'bg-amber-900/60 text-amber-200' },
  problem: { label: '✕ Unlikely to work', className: 'bg-red-900/60 text-red-200' },
};

/** How well the library suits one game system, and a way to try a board for it. */
export function CollectionCheckRow({ check, unit }: CollectionCheckRowProps) {
  const level = LEVELS[check.level];
  const { width, depth } = check.board;
  const { min, max } = check.coverageTarget;
  return (
    <li className="space-y-1.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{check.preset.name}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs ${level.className}`}>{level.label}</span>
      </div>
      <p className="text-xs text-stone-400">
        Your terrain covers {percent(check.coverage)} of a {formatLength(width, unit)} ×{' '}
        {formatLength(depth, unit)} board. Boards use {percent(min)} to {percent(max)}.
      </p>
      {check.findings.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-300">
          {check.findings.map((finding) => (
            <li key={finding.message}>{finding.message}</li>
          ))}
        </ul>
      )}
      <Link
        to="/board"
        state={{ presetId: check.preset.id }}
        className="inline-block text-sm text-amber-300 underline hover:text-amber-200"
      >
        Try a board for {check.preset.name}
      </Link>
    </li>
  );
}

function percent(share: number): string {
  return `${String(Math.round(share * 100))}%`;
}
