import { describe, expect, it } from 'vitest';
import {
  canSave,
  EMPTY_ACCOUNT_DRAFT,
  hasErrors,
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
  const filled = { email: ' robin@example.com ', password: 'longenough', repeat: 'longenough' };

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

  it('needs at least 8 characters for a new password only', () => {
    const short = { ...filled, password: 'short', repeat: 'short' };
    expect(validateAccountDraft('createAccount', short).password).toBe(
      'Use at least 8 characters.',
    );
    expect(hasErrors(validateAccountDraft('signIn', short))).toBe(false);
  });

  it('needs the repeated password to match when creating an account', () => {
    expect(validateAccountDraft('createAccount', { ...filled, repeat: 'other' })).toEqual({
      repeat: 'The passwords do not match.',
    });
    expect(validateAccountDraft('signIn', { ...filled, repeat: 'other' })).toEqual({});
  });
});
