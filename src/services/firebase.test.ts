import { describe, expect, it } from 'vitest';
import { parseFirebaseEnv } from './firebase';

const real = {
  VITE_FIREBASE_API_KEY: 'AIzaSyExampleExampleExampleExample123',
  VITE_FIREBASE_AUTH_DOMAIN: 'terrain-forge.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'terrain-forge',
  VITE_FIREBASE_STORAGE_BUCKET: 'terrain-forge.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
  VITE_FIREBASE_APP_ID: '1:123456789012:web:abcdef',
};

const demo = {
  ...real,
  VITE_FIREBASE_API_KEY: 'demo-api-key',
  VITE_FIREBASE_PROJECT_ID: 'demo-terrain-forge',
};

describe('parseFirebaseEnv', () => {
  it('accepts a real project', () => {
    expect(parseFirebaseEnv(real).VITE_FIREBASE_PROJECT_ID).toBe('terrain-forge');
    expect(parseFirebaseEnv({ ...real, VITE_USE_EMULATORS: 'false' }).VITE_USE_EMULATORS).toBe(
      'false',
    );
  });

  it('accepts the demo values with the emulators', () => {
    expect(parseFirebaseEnv({ ...demo, VITE_USE_EMULATORS: 'true' }).VITE_FIREBASE_API_KEY).toBe(
      'demo-api-key',
    );
  });

  it('refuses the demo values without the emulators, naming each one', () => {
    expect(() => parseFirebaseEnv(demo)).toThrow(
      /^VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID still have the demo values/,
    );
    expect(() =>
      parseFirebaseEnv({
        ...real,
        VITE_FIREBASE_API_KEY: 'demo-api-key',
        VITE_USE_EMULATORS: 'false',
      }),
    ).toThrow(/^VITE_FIREBASE_API_KEY still has the demo value/);
  });

  it('names the missing values', () => {
    expect(() => parseFirebaseEnv({ ...real, VITE_FIREBASE_APP_ID: '' })).toThrow(
      /VITE_FIREBASE_APP_ID/,
    );
  });
});
