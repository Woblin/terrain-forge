import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { boardNameError, SAVED_BOARD_LIMITS } from '../domain/savedBoard';

interface BoardNameDialogProps {
  title: string;
  initialName: string;
  confirmLabel: string;
  /** Saves under the name; returns a message when that did not work, or null. */
  onConfirm: (name: string) => string | null;
  onCancel: () => void;
}

/** Asks for a board's name, to save, copy or rename it. */
export function BoardNameDialog({
  title,
  initialName,
  confirmLabel,
  onConfirm,
  onCancel,
}: BoardNameDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const problem = boardNameError(name) ?? onConfirm(name.trim());
    setError(problem);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="border-line bg-surface text-ink shadow-shade m-auto max-w-[calc(100vw-2rem)] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} className="w-96 max-w-full space-y-4 p-5">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        <div className="space-y-1">
          <label htmlFor={`${id}-name`} className="text-soft block text-sm">
            Name
          </label>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            maxLength={SAVED_BOARD_LIMITS.nameLength}
            autoComplete="off"
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : `${id}-error`}
            className="border-line-strong bg-raised w-full rounded-lg border px-2 py-1.5"
          />
          {error !== null && (
            <p id={`${id}-error`} role="alert" className="text-fail text-sm">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border-line-strong hover:bg-hover rounded-lg border px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-accent text-on-accent hover:bg-accent-hover rounded-lg px-3 py-1.5 font-semibold"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
