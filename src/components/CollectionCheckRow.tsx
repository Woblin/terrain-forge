import { Link } from 'react-router';
import type { CheckLevel, PresetCheck } from '../domain/collectionCheck';
import { formatLength, type LengthUnit } from '../domain/units';
import { CoverageBar } from './CoverageBar';

interface CollectionCheckRowProps {
  check: PresetCheck;
  unit: LengthUnit;
}

const LEVELS: Readonly<Record<CheckLevel, { label: string; className: string }>> = {
  ok: { label: '✓ Ready', className: 'bg-pass-soft text-pass border-pass-line' },
  warning: {
    label: 'Playable, with notes',
    className: 'bg-warn-soft text-warn-ink border-warn-line',
  },
  problem: { label: "✕ Won't work well", className: 'bg-fail-soft text-fail border-fail-line' },
};

/** How well the library suits one game system, what would make it better, and a board to try. */
export function CollectionCheckRow({ check, unit }: CollectionCheckRowProps) {
  const level = LEVELS[check.level];
  const { width, depth } = check.board;
  const { min, max } = check.coverageTarget;
  return (
    <li className="border-line flex flex-col gap-1.5 border-t py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{check.preset.name}</p>
        <span className={`rounded-full border px-2 text-[13px] font-bold ${level.className}`}>
          {level.label}
        </span>
      </div>
      <CoverageBar coverage={check.coverage} target={check.coverageTarget} />
      <p className="text-muted text-xs">
        Covers {percent(check.coverage)} of a {formatLength(width, unit)} ×{' '}
        {formatLength(depth, unit)} board. Boards use {percent(min)} to {percent(max)} (shaded).
      </p>
      {check.findings.length > 0 && (
        <>
          <p className="text-soft mt-0.5 text-xs font-bold">To make boards better:</p>
          <ul className="text-soft flex list-disc flex-col gap-0.5 pl-[18px] text-xs">
            {check.findings.map((finding) => (
              <li key={finding.message}>{finding.message}</li>
            ))}
          </ul>
        </>
      )}
      <Link
        to="/board"
        state={{ presetId: check.preset.id }}
        className="text-accent-ink hover:text-accent-ink-hover self-start text-xs font-semibold underline"
      >
        Try a board for {check.preset.name}
      </Link>
    </li>
  );
}

function percent(share: number): string {
  return `${String(Math.round(share * 100))}%`;
}
