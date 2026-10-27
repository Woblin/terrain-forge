import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLatestOnlyQueue } from './latestOnlyQueue';

/** Work that only finishes when the test says so. */
function controlledWork() {
  const started: number[] = [];
  const finishers: (() => void)[] = [];
  const work = (value: number) => {
    started.push(value);
    return new Promise<void>((resolve) => finishers.push(resolve));
  };
  const finish = async () => {
    finishers.shift()?.();
    await Promise.resolve();
    await Promise.resolve();
  };
  return { started, work, finish };
}

describe('createLatestOnlyQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits the delay, then runs only the latest value', () => {
    const { started, work } = controlledWork();
    const queue = createLatestOnlyQueue(work, 100, vi.fn());
    queue.push(1);
    queue.push(2);
    vi.advanceTimersByTime(99);
    expect(started).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(started).toEqual([2]);
  });

  it('never runs twice at once, and runs the newest value once the work finishes', async () => {
    const { started, work, finish } = controlledWork();
    const queue = createLatestOnlyQueue(work, 100, vi.fn());
    queue.push(1);
    vi.advanceTimersByTime(100);
    queue.push(2);
    queue.push(3);
    vi.advanceTimersByTime(1000);
    expect(started).toEqual([1]);
    await finish();
    vi.advanceTimersByTime(100);
    expect(started).toEqual([1, 3]);
    await finish();
    vi.advanceTimersByTime(1000);
    expect(started).toEqual([1, 3]);
  });

  it('reports failed work and keeps going', async () => {
    const started: number[] = [];
    const onError = vi.fn();
    const queue = createLatestOnlyQueue(
      (value: number) => {
        started.push(value);
        return Promise.reject(new Error('boom'));
      },
      10,
      onError,
    );
    queue.push(1);
    await vi.advanceTimersByTimeAsync(10);
    queue.push(2);
    await vi.advanceTimersByTimeAsync(10);
    expect(started).toEqual([1, 2]);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(new Error('boom'));
  });

  it('starts nothing after it is disposed', async () => {
    const { started, work, finish } = controlledWork();
    const queue = createLatestOnlyQueue(work, 100, vi.fn());
    queue.push(1);
    vi.advanceTimersByTime(100);
    queue.push(2);
    queue.dispose();
    await finish();
    vi.advanceTimersByTime(1000);
    queue.push(3);
    vi.advanceTimersByTime(1000);
    expect(started).toEqual([1]);
  });
});
