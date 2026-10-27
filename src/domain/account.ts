/** How a player proves who they are. */
export type SignInMethod = 'google' | 'password';

/** The signed-in player, as the app sees them. */
export interface AppUser {
  readonly uid: string;
  readonly email: string | null;
  /** Google accounts arrive verified; email accounts once the link in the email is clicked. */
  readonly emailVerified: boolean;
  readonly methods: readonly SignInMethod[];
}

/** Only a verified email may save to the player's account. */
export function canSave(user: AppUser | null): boolean {
  return user?.emailVerified === true;
}

export const MIN_PASSWORD_LENGTH = 8;

export type AccountFormMode = 'signIn' | 'createAccount' | 'resetPassword';

/** What the player typed into the email form. */
export interface AccountDraft {
  readonly email: string;
  readonly password: string;
  readonly repeat: string;
}

export type AccountField = keyof AccountDraft;

export type AccountErrors = Readonly<Partial<Record<AccountField, string>>>;

export const EMPTY_ACCOUNT_DRAFT: AccountDraft = { email: '', password: '', repeat: '' };

/** Just enough to catch typos; Firebase has the final say on what an email address is. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks the email form before anything is sent to Firebase. No errors means it can be sent. */
export function validateAccountDraft(mode: AccountFormMode, draft: AccountDraft): AccountErrors {
  const errors: Partial<Record<AccountField, string>> = {};
  const email = emailError(draft.email);
  if (email !== undefined) {
    errors.email = email;
  }
  if (mode === 'resetPassword') {
    return errors;
  }
  const password = mode === 'createAccount' ? newPasswordError(draft.password) : undefined;
  if (password !== undefined) {
    errors.password = password;
  } else if (draft.password === '') {
    errors.password = 'Enter your password.';
  }
  if (mode === 'createAccount' && draft.repeat !== draft.password) {
    errors.repeat = 'The passwords do not match.';
  }
  return errors;
}

export function hasErrors(errors: AccountErrors): boolean {
  return Object.keys(errors).length > 0;
}

function emailError(email: string): string | undefined {
  const trimmed = email.trim();
  if (trimmed === '') {
    return 'Enter your email address.';
  }
  return EMAIL_PATTERN.test(trimmed) ? undefined : 'Check the email address.';
}

function newPasswordError(password: string): string | undefined {
  return password.length < MIN_PASSWORD_LENGTH
    ? `Use at least ${String(MIN_PASSWORD_LENGTH)} characters.`
    : undefined;
}
