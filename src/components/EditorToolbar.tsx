import { ToolbarToggle } from './ToolbarToggle';

interface EditorToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  /** The selected piece's name and the placement rules it breaks, or null. */
  selection: { name: string; problems: readonly string[] } | null;
  snap: boolean;
  movePairs: boolean;
  showPhotos: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTurn: (degrees: number) => void;
  onRemove: () => void;
  onSnapChange: (snap: boolean) => void;
  onMovePairsChange: (movePairs: boolean) => void;
  onShowPhotosChange: (show: boolean) => void;
}

const BUTTON =
  'rounded border border-stone-500 px-2.5 py-1.5 text-sm hover:bg-stone-700 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-amber-300';

/** Undo, redo, turning and removing the selected piece, and the editing options. */
export function EditorToolbar({
  canUndo,
  canRedo,
  selection,
  snap,
  movePairs,
  showPhotos,
  onUndo,
  onRedo,
  onTurn,
  onRemove,
  onSnapChange,
  onMovePairsChange,
  onShowPhotosChange,
}: EditorToolbarProps) {
  const hasSelection = selection !== null;
  return (
    <div className="space-y-2">
      <div role="toolbar" aria-label="Edit the board" className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onUndo} disabled={!canUndo} className={BUTTON}>
          Undo
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} className={BUTTON}>
          Redo
        </button>
        <span className="mx-1 h-6 w-px bg-stone-700" aria-hidden="true" />
        <button
          type="button"
          onClick={() => {
            onTurn(-15);
          }}
          disabled={!hasSelection}
          aria-label="Turn left 15 degrees"
          className={BUTTON}
        >
          ⟲ 15°
        </button>
        <button
          type="button"
          onClick={() => {
            onTurn(15);
          }}
          disabled={!hasSelection}
          aria-label="Turn right 15 degrees"
          className={BUTTON}
        >
          ⟳ 15°
        </button>
        <button type="button" onClick={onRemove} disabled={!hasSelection} className={BUTTON}>
          Remove
        </button>
        <span className="mx-1 h-6 w-px bg-stone-700" aria-hidden="true" />
        <ToolbarToggle label="Snap" checked={snap} onChange={onSnapChange} />
        <ToolbarToggle
          label="Move pairs together"
          checked={movePairs}
          onChange={onMovePairsChange}
        />
        <ToolbarToggle label="Photos" checked={showPhotos} onChange={onShowPhotosChange} />
      </div>
      <div role="status" className="min-h-10 text-sm">
        {selection === null ? (
          <p className="text-stone-400">
            Select a piece to edit it. Drag to move, drag the yellow handle to turn, or drop it off
            the board to remove it. Hold Shift to place freely.
          </p>
        ) : (
          <>
            <p className="text-stone-200">{selection.name} selected.</p>
            {selection.problems.map((problem) => (
              <p key={problem} className="text-red-300">
                ⚠ {problem}
              </p>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
