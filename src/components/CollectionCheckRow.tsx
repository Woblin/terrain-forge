import { Link } from 'react-router';
import type { CheckLevel, PresetCheck } from '../domain/collectionCheck';
import { formatLength, type LengthUnit } from '../domain/units';

interface CollectionCheckRowProps {
  check: PresetCheck;
  unit: LengthUnit;
}

const LEVELS: Readonly<Record<CheckLevel, { label: string; className: string }>> = {
  ok: { label: '✓ Ready', className: 'bg-pass-soft text-pass' },
  warning: { label: '! Worth a look', className: 'bg-warn-soft text-warn-ink' },
  problem: { label: '✕ Unlikely to work', className: 'bg-fail-soft text-fail' },
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
      <p className="text-muted text-xs">
        Your terrain covers {percent(check.coverage)} of a {formatLength(width, unit)} ×{' '}
        {formatLength(depth, unit)} board. Boards use {percent(min)} to {percent(max)}.
      </p>
      {check.findings.length > 0 && (
        <ul className="text-soft list-disc space-y-1 pl-5 text-sm">
          {check.findings.map((finding) => (
            <li key={finding.message}>{finding.message}</li>
          ))}
        </ul>
      )}
      <Link
        to="/board"
        state={{ presetId: check.preset.id }}
        className="text-accent-ink hover:text-accent-ink-hover inline-block text-sm underline"
      >
        Try a board for {check.preset.name}
      </Link>
    </li>
  );
}

function percent(share: number): string {
  return `${String(Math.round(share * 100))}%`;
}
