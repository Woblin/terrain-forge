import { useId, useState, type SubmitEvent } from 'react';
import {
  EMPTY_ACCOUNT_DRAFT,
  hasErrors,
  MIN_PASSWORD_LENGTH,
  validateAccountDraft,
  type AccountDraft,
  type AccountErrors,
  type AccountField,
  type AccountFormMode,
} from '../domain/account';
import { TextButton } from './TextButton';

interface EmailFormProps {
  mode: AccountFormMode;
  busy: boolean;
  /** Why the last attempt failed, from Firebase. */
  error: string | null;
  /** What happened, when the attempt worked and the page stays, such as a reset link sent. */
  notice: string | null;
  onModeChange: (mode: AccountFormMode) => void;
  onSubmit: (mode: AccountFormMode, draft: AccountDraft) => void;
}

const INPUT = 'w-full rounded-lg border border-line-strong bg-raised px-2 py-1.5';

const TITLES: Readonly<Record<AccountFormMode, string>> = {
  signIn: 'Sign in with email',
  createAccount: 'Create an account',
  resetPassword: 'Reset your password',
};

const SUBMIT_LABELS: Readonly<Record<AccountFormMode, string>> = {
  signIn: 'Sign in',
  createAccount: 'Create account',
  resetPassword: 'Send reset link',
};

/** Signing in, creating an account or resetting a password with an email address. */
export function EmailForm({ mode, busy, error, notice, onModeChange, onSubmit }: EmailFormProps) {
  const id = useId();
  const [draft, setDraft] = useState(EMPTY_ACCOUNT_DRAFT);
  const [errors, setErrors] = useState<AccountErrors>({});

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const found = validateAccountDraft(mode, draft);
    setErrors(found);
    if (!hasErrors(found)) {
      onSubmit(mode, draft);
    }
  }

  function switchTo(next: AccountFormMode): void {
    setErrors({});
    onModeChange(next);
  }

  function field(name: AccountField, label: string, type: string, autoComplete: string) {
    const message = errors[name];
    return (
      <div className="space-y-1">
        <label htmlFor={`${id}-${name}`} className="text-soft block text-sm">
          {label}
        </label>
        <input
          id={`${id}-${name}`}
          type={type}
          autoComplete={autoComplete}
          value={draft[name]}
          aria-invalid={message !== undefined}
          aria-describedby={message === undefined ? undefined : `${id}-${name}-error`}
          onChange={(event) => {
            setDraft({ ...draft, [name]: event.target.value });
          }}
          className={INPUT}
        />
        {message !== undefined && (
          <p id={`${id}-${name}-error`} className="text-fail text-xs">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby={`${id}-title`}
      className="border-line bg-surface space-y-3 rounded-2xl border p-4 shadow-sm"
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold">
        {TITLES[mode]}
      </h2>
      {field('email', 'Email', 'email', 'email')}
      {mode !== 'resetPassword' &&
        field(
          'password',
          mode === 'createAccount'
            ? `Password (at least ${String(MIN_PASSWORD_LENGTH)} characters)`
            : 'Password',
          'password',
          mode === 'createAccount' ? 'new-password' : 'current-password',
        )}
      {mode === 'createAccount' && field('repeat', 'Repeat password', 'password', 'new-password')}
      <div aria-live="polite" className="text-sm">
        {error !== null && (
          <p role="alert" className="text-fail">
            {error}
          </p>
        )}
        {notice !== null && <p className="text-pass">{notice}</p>}
      </div>
      <button
        type="submit"
        disabled={busy}
        className="bg-accent text-on-accent hover:bg-accent-hover w-full rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
      >
        {busy ? 'Working…' : SUBMIT_LABELS[mode]}
      </button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        {mode === 'signIn' ? (
          <>
            <TextButton
              onClick={() => {
                switchTo('createAccount');
              }}
            >
              Create an account
            </TextButton>
            <TextButton
              onClick={() => {
                switchTo('resetPassword');
              }}
            >
              Forgot password?
            </TextButton>
          </>
        ) : (
          <TextButton
            onClick={() => {
              switchTo('signIn');
            }}
          >
            Back to sign in
          </TextButton>
        )}
      </div>
    </form>
  );
}
