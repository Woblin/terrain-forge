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

const MIN_PASSWORD_LENGTH = 8;

/**
 * The characters Firebase counts as special in a password policy. Others, such as a space or a
 * letter like å, do not meet the special character rule.
 */
const SPECIAL_CHARACTERS = '^$*.[]{}()?"!@#%&/\\,><\':;|_~`=+-';

/** One part of the password policy set in the Firebase console. */
export interface PasswordRule {
  readonly id: 'length' | 'lowercase' | 'uppercase' | 'number' | 'special';
  /** What the rule asks for, as a line in the checklist under the password field. */
  readonly label: string;
  readonly test: (password: string) => boolean;
}

/** Firebase checks the same rules again when the account is created. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${String(MIN_PASSWORD_LENGTH)} characters`,
    test: (password) => password.length >= MIN_PASSWORD_LENGTH,
  },
  { id: 'lowercase', label: 'A lowercase letter', test: (password) => /[a-z]/.test(password) },
  { id: 'uppercase', label: 'An uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { id: 'number', label: 'A number', test: (password) => /[0-9]/.test(password) },
  {
    id: 'special',
    label: 'A special character, such as ! ? # or %',
    test: (password) =>
      Array.from(SPECIAL_CHARACTERS).some((special) => password.includes(special)),
  },
];

/** The rules a new password does not meet yet, in checklist order. */
export function missingPasswordRules(password: string): readonly PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password));
}

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
  if (password === '') {
    return 'Choose a password.';
  }
  const missing = missingPasswordRules(password);
  return missing.length === 0
    ? undefined
    : `The password still needs: ${missing.map((rule) => rule.label.toLowerCase()).join(', ')}.`;
}
