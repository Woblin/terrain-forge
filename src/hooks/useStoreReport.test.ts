import { describe, expect, it } from 'vitest';
import { reportAfter, type Report } from './useStoreReport';

const OLD_STORE = 'old store';
const STORE = 'store';

function report(
  store: string,
  fields: Partial<Report<number, string>> = {},
): Report<number, string> {
  return { store, load: { status: 'loading' }, writeError: null, ...fields };
}

describe('reportAfter', () => {
  it('starts over when a different store reports a change', () => {
    const previous = report(OLD_STORE, {
      load: { status: 'ready', snapshot: 1 },
      writeError: 'Could not save.',
    });
    expect(reportAfter(previous, STORE, { kind: 'change', snapshot: 2 })).toEqual({
      store: STORE,
      load: { status: 'ready', snapshot: 2 },
      writeError: null,
    });
  });

  it('keeps a write error when the same store reports a new snapshot', () => {
    const previous = report(STORE, { writeError: 'Could not save.' });
    expect(reportAfter(previous, STORE, { kind: 'change', snapshot: 3 })).toEqual({
      store: STORE,
      load: { status: 'ready', snapshot: 3 },
      writeError: 'Could not save.',
    });
  });

  it('keeps what the same store loaded when a write fails, but not what another store loaded', () => {
    const loaded = { status: 'ready', snapshot: 4 } as const;
    const failed = { kind: 'writeFailed', message: 'Could not delete.' } as const;
    expect(reportAfter(report(STORE, { load: loaded }), STORE, failed)).toEqual({
      store: STORE,
      load: loaded,
      writeError: 'Could not delete.',
    });
    expect(reportAfter(report(OLD_STORE, { load: loaded }), STORE, failed).load).toEqual({
      status: 'loading',
    });
  });

  it('turns a failed load into a failed report', () => {
    const previous = report(STORE, {
      load: { status: 'ready', snapshot: 5 },
      writeError: 'Could not save.',
    });
    expect(reportAfter(previous, STORE, { kind: 'error', message: 'Could not load.' })).toEqual({
      store: STORE,
      load: { status: 'failed', message: 'Could not load.' },
      writeError: null,
    });
  });
});
