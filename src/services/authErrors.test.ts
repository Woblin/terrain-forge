import { describe, expect, it } from 'vitest';
import { authErrorMessage, deletionFailedMessage } from './authErrors';

function failure(code: string): Error {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

describe('authErrorMessage', () => {
  it('gives one message for a wrong email or password, so it does not reveal which', () => {
    expect(authErrorMessage(failure('auth/invalid-credential'))).toBe(
      'Email or password is wrong.',
    );
    expect(authErrorMessage(failure('auth/user-not-found'))).toBe('Email or password is wrong.');
  });

  it('explains what the player can do', () => {
    expect(authErrorMessage(failure('auth/popup-blocked'))).toMatch(/Allow pop-ups/);
    expect(authErrorMessage(failure('auth/account-exists-with-different-credential'))).toBe(
      'This email signs in with a password. Use the email form.',
    );
    expect(authErrorMessage(failure('auth/network-request-failed'))).toMatch(/connection/);
  });

  it('points to the API key when Firebase does not accept it', () => {
    for (const code of [
      'auth/api-key-not-valid.-please-pass-a-valid-api-key.',
      'auth/api-key-expired.-please-renew-the-api-key.',
      'auth/invalid-api-key',
    ]) {
      expect(authErrorMessage(failure(code))).toMatch(/VITE_FIREBASE_API_KEY/);
    }
  });

  it('names the whole password policy when Firebase refuses a password', () => {
    expect(authErrorMessage(failure('auth/password-does-not-meet-requirements'))).toMatch(
      /at least 8 characters, a lowercase letter, an uppercase letter, a number, a special character/,
    );
  });

  it('says nothing when the player closed the Google window', () => {
    expect(authErrorMessage(failure('auth/popup-closed-by-user'))).toBeNull();
    expect(authErrorMessage(failure('auth/cancelled-popup-request'))).toBeNull();
  });

  it('falls back to a general message for anything else', () => {
    const general = 'Something went wrong with signing in. Try again.';
    expect(authErrorMessage(failure('auth/internal-error'))).toBe(general);
    expect(authErrorMessage(new Error('boom'))).toBe(general);
    expect(authErrorMessage('boom')).toBe(general);
  });
});

describe('deletionFailedMessage', () => {
  it('says what was deleted, what was not, and that the account was kept', () => {
    expect(deletionFailedMessage(['saved boards'], 'terrain pieces with their photos')).toBe(
      'Your saved boards were deleted, but your terrain pieces with their photos could not be, so the account was kept. Check your connection and try again.',
    );
  });

  it('names every part already deleted', () => {
    expect(
      deletionFailedMessage(['saved boards', 'terrain pieces with their photos'], 'game settings'),
    ).toBe(
      'Your saved boards and terrain pieces with their photos were deleted, but your game settings could not be, so the account was kept. Check your connection and try again.',
    );
  });

  it('says nothing was deleted when the first step failed', () => {
    expect(deletionFailedMessage([], 'saved boards')).toBe(
      'Your saved boards could not be deleted, so the account was kept. Check your connection and try again.',
    );
  });
});
