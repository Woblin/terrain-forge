import { analyseBoard, type BoardAnalysis } from '../domain/boardAnalysis';
import type { FairnessInput } from '../domain/fairness';
import { generateLayout, type GenerationRequest, type GenerationResult } from '../domain/generator';

/** Work the board worker can do off the main thread. */
export type WorkerTask =
  | { readonly kind: 'generate'; readonly request: GenerationRequest }
  | { readonly kind: 'analyse'; readonly input: FairnessInput };

export type WorkerResult =
  | { readonly kind: 'generate'; readonly result: GenerationResult }
  | { readonly kind: 'analyse'; readonly analysis: BoardAnalysis };

export interface WorkerRequest {
  readonly id: number;
  readonly task: WorkerTask;
}

export type WorkerReply =
  | { readonly id: number; readonly ok: true; readonly result: WorkerResult }
  | { readonly id: number; readonly ok: false; readonly error: string };

/** Runs one task. A failure becomes an error reply, so the page can tell the player. */
export function handleRequest(request: WorkerRequest): WorkerReply {
  try {
    return { id: request.id, ok: true, result: runTask(request.task) };
  } catch (error) {
    return { id: request.id, ok: false, error: errorMessage(error) };
  }
}

function runTask(task: WorkerTask): WorkerResult {
  switch (task.kind) {
    case 'generate':
      return { kind: 'generate', result: generateLayout(task.request) };
    case 'analyse':
      return { kind: 'analyse', analysis: analyseBoard(task.input) };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isWorkerRequest(value: unknown): value is WorkerRequest {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    isRecord(value.task) &&
    (value.task.kind === 'generate' || value.task.kind === 'analyse')
  );
}

export function isWorkerReply(value: unknown): value is WorkerReply {
  return isRecord(value) && typeof value.id === 'number' && typeof value.ok === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
