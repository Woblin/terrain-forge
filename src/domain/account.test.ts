import { describe, expect, it } from 'vitest';
import {
  canSave,
  EMPTY_ACCOUNT_DRAFT,
  hasErrors,
  missingPasswordRules,
  validateAccountDraft,
  type AppUser,
} from './account';

const user: AppUser = { uid: 'u1', email: 'a@b.se', emailVerified: true, methods: ['password'] };

describe('canSave', () => {
  it('needs a signed-in player with a verified email', () => {
    expect(canSave(user)).toBe(true);
    expect(canSave({ ...user, emailVerified: false })).toBe(false);
    expect(canSave(null)).toBe(false);
  });
});

describe('validateAccountDraft', () => {
  const filled = { email: ' robin@example.com ', password: 'Long-en0ugh', repeat: 'Long-en0ugh' };

  it('accepts a complete form in every mode', () => {
    expect(validateAccountDraft('signIn', filled)).toEqual({});
    expect(validateAccountDraft('createAccount', filled)).toEqual({});
    expect(validateAccountDraft('resetPassword', filled)).toEqual({});
  });

  it('asks for every field of an empty form', () => {
    expect(validateAccountDraft('signIn', EMPTY_ACCOUNT_DRAFT)).toEqual({
      email: 'Enter your email address.',
      password: 'Enter your password.',
    });
    expect(validateAccountDraft('resetPassword', EMPTY_ACCOUNT_DRAFT)).toEqual({
      email: 'Enter your email address.',
    });
  });

  it('catches an email address without a domain', () => {
    expect(validateAccountDraft('signIn', { ...filled, email: 'robin@' }).email).toBe(
      'Check the email address.',
    );
  });

  it('checks the password policy for a new password only', () => {
    const short = { ...filled, password: 'short', repeat: 'short' };
    expect(validateAccountDraft('createAccount', short).password).toBe(
      'The password still needs: at least 8 characters, an uppercase letter, a number, ' +
        'a special character, such as ! ? # or %.',
    );
    expect(hasErrors(validateAccountDraft('signIn', short))).toBe(false);
  });

  it('asks for a new password when none is typed', () => {
    expect(validateAccountDraft('createAccount', EMPTY_ACCOUNT_DRAFT).password).toBe(
      'Choose a password.',
    );
  });

  it('needs the repeated password to match when creating an account', () => {
    expect(validateAccountDraft('createAccount', { ...filled, repeat: 'other' })).toEqual({
      repeat: 'The passwords do not match.',
    });
    expect(validateAccountDraft('signIn', { ...filled, repeat: 'other' })).toEqual({});
  });
});

describe('missingPasswordRules', () => {
  function missing(password: string): string[] {
    return missingPasswordRules(password).map((rule) => rule.id);
  }

  it('accepts a password that meets every rule', () => {
    expect(missing('Abcdef1!')).toEqual([]);
  });

  it('names each rule a password misses', () => {
    expect(missing('')).toEqual(['length', 'lowercase', 'uppercase', 'number', 'special']);
    expect(missing('abcdefgh')).toEqual(['uppercase', 'number', 'special']);
    expect(missing('ABCDEFG1!')).toEqual(['lowercase']);
    expect(missing('Abcdefg!')).toEqual(['number']);
    expect(missing('Abc1!')).toEqual(['length']);
  });

  it('counts the characters Firebase counts as special, and not others', () => {
    for (const special of ['^', '$', '*', '.', '[', '"', '\\', "'", '`', '=', '+', '-', '_', '~']) {
      expect(missing(`Abcdefg1${special}`)).toEqual([]);
    }
    expect(missing('Abcdefg1 ')).toEqual(['special']);
    expect(missing('Abcdefg1å')).toEqual(['special']);
  });

  it('only counts plain letters as lowercase and uppercase', () => {
    expect(missing('ÅÄÖABCD1!')).toEqual(['lowercase']);
    expect(missing('åäöabcd1!')).toEqual(['uppercase']);
  });
});
