import { useCallback, useEffect, useRef, useState } from 'react';
import type { GenerationRequest, GenerationResult } from '../domain/generator';
import { useWorkerClient } from './useWorkerClient';

export interface GeneratorStatus {
  readonly running: boolean;
  /** True once a generation has run for longer than a few seconds. */
  readonly slow: boolean;
  readonly error: string | null;
}

/** After this long, the page tells the player generation is still running. */
const SLOW_AFTER_MS = 3000;

/**
 * Generates layouts in the board worker. Starting a new generation stops the one in progress;
 * the stopped one resolves to null.
 */
export function useGenerator(): {
  status: GeneratorStatus;
  generate: (request: GenerationRequest) => Promise<GenerationResult | null>;
} {
  const client = useWorkerClient();
  const slowTimer = useRef<number | null>(null);
  const [status, setStatus] = useState<GeneratorStatus>({
    running: false,
    slow: false,
    error: null,
  });

  useEffect(
    () => () => {
      clearSlowTimer(slowTimer);
    },
    [],
  );

  const generate = useCallback(
    async (request: GenerationRequest): Promise<GenerationResult | null> => {
      const worker = client.current;
      if (worker === null) {
        return null;
      }
      worker.cancel();
      clearSlowTimer(slowTimer);
      setStatus({ running: true, slow: false, error: null });
      slowTimer.current = window.setTimeout(() => {
        setStatus((current) => ({ ...current, slow: current.running }));
      }, SLOW_AFTER_MS);
      const outcome = await worker.run({ kind: 'generate', request });
      if (outcome.status === 'cancelled') {
        return null;
      }
      clearSlowTimer(slowTimer);
      if (outcome.status === 'failed' || outcome.result.kind !== 'generate') {
        const error = outcome.status === 'failed' ? outcome.message : 'Generation failed.';
        setStatus({ running: false, slow: false, error });
        return null;
      }
      const { result } = outcome.result;
      setStatus({ running: false, slow: false, error: result.ok ? null : result.reason });
      return result;
    },
    [client],
  );

  return { status, generate };
}

function clearSlowTimer(timer: { current: number | null }): void {
  if (timer.current !== null) {
    window.clearTimeout(timer.current);
    timer.current = null;
  }
}

/** A fresh random seed for a new board. */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}
