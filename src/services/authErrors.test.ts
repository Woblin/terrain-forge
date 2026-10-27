import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authErrors';

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
