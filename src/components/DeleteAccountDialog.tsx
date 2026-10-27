import { useEffect, useId, useRef, useState } from 'react';
import type { Reauthentication } from '../services/auth';

interface DeleteAccountDialogProps {
  /** True when the player confirms with their password, false when with Google. */
  usesPassword: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: (proof: Reauthentication) => void;
  onCancel: () => void;
}

/** Asks the player to confirm it is them before their account, terrain and boards are deleted. */
export function DeleteAccountDialog({
  usesPassword,
  busy,
  error,
  onConfirm,
  onCancel,
}: DeleteAccountDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [password, setPassword] = useState('');

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
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          onCancel();
        }
      }}
      className="border-line bg-surface text-ink shadow-shade m-auto max-w-[calc(100vw-2rem)] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <form
        className="max-w-sm space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(usesPassword ? { kind: 'password', password } : { kind: 'google' });
        }}
      >
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          Delete your account?
        </h2>
        <p className="text-soft text-sm">
          Your account, every terrain piece, photo and saved board are deleted for good. This
          can&apos;t be undone.
        </p>
        {usesPassword ? (
          <div className="space-y-1">
            <label htmlFor={`${id}-password`} className="text-soft block text-sm">
              Your password, to confirm it is you
            </label>
            <input
              id={`${id}-password`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              className="border-line-strong bg-raised w-full rounded-lg border px-2 py-1.5"
            />
          </div>
        ) : (
          <p className="text-soft text-sm">Google asks you to confirm it is you first.</p>
        )}
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
            className="border-line-strong hover:bg-hover rounded-lg border px-3 py-1.5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || (usesPassword && password === '')}
            className="bg-danger hover:bg-danger-hover rounded-lg px-3 py-1.5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete everything'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
