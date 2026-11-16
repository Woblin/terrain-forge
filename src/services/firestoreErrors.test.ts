import { describe, expect, it } from 'vitest';
import { writeFailureReason } from './firestoreErrors';

describe('writeFailureReason', () => {
  it('asks to sign in again when the server refuses the player', () => {
    expect(writeFailureReason({ code: 'permission-denied' })).toMatch(/sign in again/);
  });

  it('names a value the server cannot store', () => {
    expect(writeFailureReason({ code: 'invalid-argument' })).toMatch(/too large/);
  });

  it('asks to wait when there were too many writes', () => {
    expect(writeFailureReason({ code: 'resource-exhausted' })).toMatch(/Wait a minute/);
  });

  it.each([{ code: 'unavailable' }, new Error('boom'), null, 'text'])(
    'points at the connection for %j',
    (error) => {
      expect(writeFailureReason(error)).toMatch(/Check your connection/);
    },
  );
});
