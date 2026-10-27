export interface LatestOnlyQueue<T> {
  /** Asks for work on `value`. Values pushed while waiting or working replace each other. */
  push(value: T): void;
  /** Drops waiting work; work in progress finishes but nothing new starts. */
  dispose(): void;
}

/**
 * Runs `work` on the latest value pushed, at most once per `delayMs`, and never twice at the same
 * time. Values that are overtaken before their turn are skipped. If `work` fails, `onError` gets
 * the error and the queue carries on.
 */
export function createLatestOnlyQueue<T>(
  work: (value: T) => Promise<void>,
  delayMs: number,
  onError: (error: unknown) => void,
): LatestOnlyQueue<T> {
  let waiting: { readonly value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let busy = false;
  let disposed = false;

  function schedule(): void {
    if (disposed || busy || timer !== null || waiting === null) {
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      void runNext();
    }, delayMs);
  }

  async function runNext(): Promise<void> {
    if (waiting === null || disposed) {
      return;
    }
    const { value } = waiting;
    waiting = null;
    busy = true;
    try {
      await work(value);
    } catch (error) {
      onError(error);
    } finally {
      busy = false;
      schedule();
    }
  }

  return {
    push(value) {
      waiting = { value };
      schedule();
    },
    dispose() {
      disposed = true;
      waiting = null;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
