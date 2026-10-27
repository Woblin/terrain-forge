import { useEffect, useId, useRef } from 'react';

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
      className="m-auto max-w-[calc(100vw-2rem)] rounded-lg bg-stone-800 p-0 text-stone-100 backdrop:bg-black/70"
    >
      <div className="max-w-sm space-y-4 p-5">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p id={messageId} className="text-sm text-stone-300">
          {message}
        </p>
        {error !== null && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded border border-stone-500 px-3 py-1.5 hover:bg-stone-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
