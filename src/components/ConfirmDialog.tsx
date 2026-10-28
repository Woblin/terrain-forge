import { useEffect, useId, useRef } from 'react';
import { BUTTON_STYLES } from './buttonStyles';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks the player to confirm a step that cannot be undone. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

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
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          onCancel();
        }
      }}
      className="border-line bg-surface text-ink shadow-shade m-auto max-w-[calc(100vw-2rem)] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="max-w-sm space-y-4 p-5">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p id={messageId} className="text-soft text-sm">
          {message}
        </p>
        {error !== null && (
          <p role="alert" className="text-fail text-sm">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={BUTTON_STYLES.secondary}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={BUTTON_STYLES.danger}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
