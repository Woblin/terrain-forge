interface EditorStatusProps {
  /** The selected piece's name and the placement rules it breaks, or null. */
  selection: { name: string; problems: readonly string[]; detail?: string } | null;
}

/** What is selected and what is wrong with it, or how to edit when nothing is. */
export function EditorStatus({ selection }: EditorStatusProps) {
  return (
    <div role="status" className="min-h-10 text-sm">
      {selection === null ? (
        <p className="text-muted">
          Select a piece to edit it. Drag to move, drag the yellow handle to turn, or drop it off
          the board to remove it. Hold Shift to place freely.
        </p>
      ) : (
        <>
          <p className="text-ink">{selection.name} selected.</p>
          {selection.detail !== undefined && (
            <p className="text-soft tabular-nums">{selection.detail}</p>
          )}
          {selection.problems.map((problem) => (
            <p key={problem} className="text-fail">
              ⚠ {problem}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
