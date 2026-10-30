interface SavedBoardBadgeProps {
  /** Whether the board passed every balance rule that was on when it was saved. */
  passed: boolean;
}

/** "✓ Passed" or "! Some rules failed", told apart by mark and words as well as colour. */
export function SavedBoardBadge({ passed }: SavedBoardBadgeProps) {
  return passed ? (
    <span className="bg-pass-soft text-pass border-pass-line rounded-full border px-[9px] font-bold">
      ✓ Passed
    </span>
  ) : (
    <span className="bg-warn-soft text-warn-ink border-warn-line rounded-full border px-[9px] font-bold">
      ! Some rules failed
    </span>
  );
}
