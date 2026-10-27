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

/** Asks the player to confirm it is them before their account and terrain are deleted. */
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
      className="m-auto max-w-[calc(100vw-2rem)] rounded-lg bg-stone-800 p-0 text-stone-100 backdrop:bg-black/70"
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
        <p className="text-sm text-stone-300">
          Your account, every terrain piece and every photo are deleted for good. This can&apos;t be
          undone.
        </p>
        {usesPassword ? (
          <div className="space-y-1">
            <label htmlFor={`${id}-password`} className="block text-sm text-stone-300">
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
              className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5"
            />
          </div>
        ) : (
          <p className="text-sm text-stone-300">Google asks you to confirm it is you first.</p>
        )}
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
            type="submit"
            disabled={busy || (usesPassword && password === '')}
            className="rounded bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete everything'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
