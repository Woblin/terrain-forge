import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useId, useState, type ChangeEvent, type ReactNode, type SubmitEvent } from 'react';
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
import { BUTTON_STYLES } from './buttonStyles';
import { FIELD_ERROR_STYLES, LABEL_STYLES, LARGE_FIELD_STYLES } from './fieldStyles';
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

interface FieldSetup {
  readonly name: AccountField;
  readonly label: string;
  readonly autoComplete: string;
  /** Shown under the label before anything is wrong, such as how long a password must be. */
  readonly hint?: string;
}

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

const FIELD_ORDER: readonly AccountField[] = ['email', 'password', 'repeat'];

/** Signing in, creating an account or resetting a password with an email address. */
export function EmailForm({ mode, busy, error, notice, onModeChange, onSubmit }: EmailFormProps) {
  const id = useId();
  const [draft, setDraft] = useState(EMPTY_ACCOUNT_DRAFT);
  const [errors, setErrors] = useState<AccountErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const found = validateAccountDraft(mode, draft);
    setErrors(found);
    const firstWrong = FIELD_ORDER.find((name) => found[name] !== undefined);
    if (firstWrong !== undefined) {
      document.getElementById(`${id}-${firstWrong}`)?.focus();
    }
    if (!hasErrors(found)) {
      onSubmit(mode, draft);
    }
  }

  function switchTo(next: AccountFormMode): void {
    setErrors({});
    onModeChange(next);
  }

  function emailField() {
    return field(
      { name: 'email', label: 'Email', autoComplete: 'email' },
      <input
        {...inputProps('email', false)}
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        className={LARGE_FIELD_STYLES}
      />,
    );
  }

  function passwordField(setup: FieldSetup) {
    return field(
      setup,
      <div className="relative">
        <input
          {...inputProps(setup.name, setup.hint !== undefined)}
          type={showPassword ? 'text' : 'password'}
          autoComplete={setup.autoComplete}
          className={`${LARGE_FIELD_STYLES} pr-12`}
        />
        {setup.name === 'password' && (
          <button
            type="button"
            aria-label="Show password"
            aria-pressed={showPassword}
            title={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => {
              setShowPassword(!showPassword);
            }}
            className="text-muted hover:text-ink focus-visible:outline-accent-ink absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl focus-visible:outline-2"
          >
            {showPassword ? (
              <EyeOffIcon className="size-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="size-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>,
    );
  }

  /** The props every field's input shares; the hint or the error describes it. */
  function inputProps(name: AccountField, hasHint: boolean) {
    const wrong = errors[name] !== undefined;
    const describedBy = wrong ? `${id}-${name}-error` : hasHint ? `${id}-${name}-hint` : undefined;
    return {
      id: `${id}-${name}`,
      value: draft[name],
      'aria-invalid': wrong,
      'aria-describedby': describedBy,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        setDraft({ ...draft, [name]: event.target.value });
      },
    };
  }

  function field(setup: FieldSetup, input: ReactNode) {
    const message = errors[setup.name];
    return (
      <div>
        <label htmlFor={`${id}-${setup.name}`} className={LABEL_STYLES}>
          {setup.label}
        </label>
        {input}
        {setup.hint !== undefined && message === undefined && (
          <p id={`${id}-${setup.name}-hint`} className="text-muted mt-1.5 text-xs">
            {setup.hint}
          </p>
        )}
        {message !== undefined && (
          <p id={`${id}-${setup.name}-error`} className={FIELD_ERROR_STYLES}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby={`${id}-title`} className="space-y-4">
      <h2 id={`${id}-title`} className="text-lg font-semibold">
        {TITLES[mode]}
      </h2>
      {emailField()}
      {mode !== 'resetPassword' &&
        passwordField(
          mode === 'createAccount'
            ? {
                name: 'password',
                label: 'Password',
                autoComplete: 'new-password',
                hint: `At least ${String(MIN_PASSWORD_LENGTH)} characters.`,
              }
            : { name: 'password', label: 'Password', autoComplete: 'current-password' },
        )}
      {mode === 'createAccount' &&
        passwordField({ name: 'repeat', label: 'Repeat password', autoComplete: 'new-password' })}
      {error !== null && (
        <p
          role="alert"
          className="border-fail-line bg-fail-soft text-fail rounded-lg border p-3 text-sm"
        >
          {error}
        </p>
      )}
      {notice !== null && (
        <p role="status" className="bg-pass-soft text-pass rounded-lg p-3 text-sm">
          {notice}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${BUTTON_STYLES.primary} h-12 w-full`}>
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
