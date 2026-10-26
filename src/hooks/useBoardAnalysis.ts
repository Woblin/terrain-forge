import { useEffect, useRef, useState } from 'react';
import type { BoardAnalysis } from '../domain/boardAnalysis';
import type { FairnessInput } from '../domain/fairness';
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

/** Keeps a fairness analysis of the board up to date, worked out in the board worker. */
export function useBoardAnalysis(input: FairnessInput | null): BoardAnalysisState {
  const client = useWorkerClient();
  const latest = useRef<FairnessInput | null>(null);
  const timer = useRef<number | null>(null);
  const [result, setResult] = useState<{
    input: FairnessInput;
    analysis: BoardAnalysis;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    latest.current = input;
    if (input === null || timer.current !== null) {
      return;
    }
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const requested = latest.current;
      const worker = client.current;
      if (requested === null || worker === null) {
        return;
      }
      void worker.run({ kind: 'analyse', input: requested }).then((outcome) => {
        if (outcome.status === 'done' && outcome.result.kind === 'analyse') {
          setResult({ input: requested, analysis: outcome.result.analysis });
          setError(null);
        } else if (outcome.status === 'failed') {
          setError(outcome.message);
        }
      });
    }, ANALYSIS_INTERVAL_MS);
  }, [input, client]);

  return {
    analysis: result?.analysis ?? null,
    current: result !== null && result.input === input,
    error,
  };
}
