import { defineConfig } from 'vitest/config';

/** Firestore security rules tests. Run with `yarn test:rules`, which starts the emulator. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
