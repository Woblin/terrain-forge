import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { boardNameError, SAVED_BOARD_LIMITS } from '../domain/savedBoard';
import { BUTTON_STYLES } from './buttonStyles';
import { FIELD_ERROR_STYLES, FIELD_STYLES, LABEL_STYLES } from './fieldStyles';

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
      className="parchment frame m-auto max-w-[calc(100vw-2rem)] rounded-sm p-0 backdrop:bg-black/70"
    >
      <form onSubmit={submit} className="w-96 max-w-full space-y-4 p-6">
        <h2 id={`${id}-title`} className="font-display text-[22px] leading-tight">
          {title}
        </h2>
        <div>
          <label htmlFor={`${id}-name`} className={LABEL_STYLES}>
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
            className={FIELD_STYLES}
          />
          {error !== null && (
            <p id={`${id}-error`} role="alert" className={FIELD_ERROR_STYLES}>
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={BUTTON_STYLES.secondary}>
            Cancel
          </button>
          <button type="submit" className={BUTTON_STYLES.primary}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
