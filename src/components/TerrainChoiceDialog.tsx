import { useEffect, useId, useRef } from 'react';
import { BUTTON_STYLES } from './buttonStyles';

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
      className="border-line bg-surface text-ink shadow-shade m-auto max-w-[calc(100vw-2rem)] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="max-w-sm space-y-4 p-5">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          Which terrain for the new board?
        </h2>
        <p id={`${id}-message`} className="text-soft text-sm">
          This board&apos;s terrain is not the same as your library now.
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onBoardTerrain} className={BUTTON_STYLES.primary}>
            This board&apos;s terrain
          </button>
          <button type="button" onClick={onLibrary} className={BUTTON_STYLES.secondary}>
            My library as it is now
          </button>
          <button type="button" onClick={onCancel} className={BUTTON_STYLES.quiet}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
