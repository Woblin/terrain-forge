import { useEffect, useId, useRef } from 'react';

interface TerrainChoiceDialogProps {
  onBoardTerrain: () => void;
  onLibrary: () => void;
  onCancel: () => void;
}

/** Asks which terrain a new board is made from, when the board's terrain is not the library's. */
export function TerrainChoiceDialog({
  onBoardTerrain,
  onLibrary,
  onCancel,
}: TerrainChoiceDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto max-w-[calc(100vw-2rem)] rounded-lg bg-stone-800 p-0 text-stone-100 backdrop:bg-black/70"
    >
      <div className="max-w-sm space-y-4 p-5">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          Which terrain for the new board?
        </h2>
        <p id={`${id}-message`} className="text-sm text-stone-300">
          This board&apos;s terrain is not the same as your library now.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onBoardTerrain}
            className="rounded bg-amber-500 px-3 py-1.5 font-semibold text-stone-950 hover:bg-amber-400"
          >
            This board&apos;s terrain
          </button>
          <button
            type="button"
            onClick={onLibrary}
            className="rounded border border-stone-500 px-3 py-1.5 hover:bg-stone-700"
          >
            My library as it is now
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-stone-300 hover:bg-stone-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
