import { useEffect, useRef, useState } from 'react';
import type { BoardAnalysis } from '../domain/boardAnalysis';
import type { FairnessInput } from '../domain/fairness';
import { createLatestOnlyQueue, type LatestOnlyQueue } from '../services/latestOnlyQueue';
import { useWorkerClient } from './useWorkerClient';

/** Boards are analysed at most this often while a piece is being dragged. */
const ANALYSIS_INTERVAL_MS = 100;

export interface BoardAnalysisState {
  /** The latest finished analysis, possibly of an older version of the board. */
  readonly analysis: BoardAnalysis | null;
  /** True when `analysis` belongs to the board as it is now. */
  readonly current: boolean;
  readonly error: string | null;
}

/**
 * Keeps a fairness analysis of the board up to date, worked out in the board worker. One
 * analysis runs at a time; boards that change while it runs are skipped except the latest.
 */
export function useBoardAnalysis(input: FairnessInput | null): BoardAnalysisState {
  const client = useWorkerClient();
  const queue = useRef<LatestOnlyQueue<FairnessInput> | null>(null);
  const [result, setResult] = useState<{
    input: FairnessInput;
    analysis: BoardAnalysis;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const created = createLatestOnlyQueue(
      async (requested: FairnessInput) => {
        const worker = client.current;
        if (worker === null) {
          return;
        }
        const outcome = await worker.run({ kind: 'analyse', input: requested });
        if (outcome.status === 'done' && outcome.result.kind === 'analyse') {
          setResult({ input: requested, analysis: outcome.result.analysis });
          setError(null);
        } else if (outcome.status === 'failed') {
          setError(outcome.message);
        }
      },
      ANALYSIS_INTERVAL_MS,
      (failure) => {
        console.error('Board analysis failed.', failure);
        setError('The fairness check stopped unexpectedly. Move a piece to try again.');
      },
    );
    queue.current = created;
    return () => {
      created.dispose();
      queue.current = null;
    };
  }, [client]);

  useEffect(() => {
    if (input !== null) {
      queue.current?.push(input);
    }
  }, [input]);

  return {
    analysis: result?.analysis ?? null,
    current: result !== null && result.input === input,
    error,
  };
}
