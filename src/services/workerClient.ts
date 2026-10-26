import {
  isWorkerReply,
  type WorkerRequest,
  type WorkerResult,
  type WorkerTask,
} from './boardWorkerProtocol';

export type WorkerOutcome =
  | { readonly status: 'done'; readonly result: WorkerResult }
  | { readonly status: 'cancelled' }
  | { readonly status: 'failed'; readonly message: string };

/** The parts of a `Worker` the client uses, so tests can pass a stand-in. */
export interface WorkerPort {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export interface WorkerClient {
  /** Runs a task; tasks run one after another in the order they were sent. */
  run(task: WorkerTask): Promise<WorkerOutcome>;
  /** Stops the work in progress. Waiting tasks finish as cancelled; the next run starts afresh. */
  cancel(): void;
}

const CRASH_MESSAGE = 'The board worker stopped unexpectedly. Try again.';

export function spawnBoardWorker(): WorkerPort {
  return new Worker(new URL('./boardWorker.ts', import.meta.url), { type: 'module' });
}

export function createWorkerClient(spawn: () => WorkerPort): WorkerClient {
  let worker: WorkerPort | null = null;
  let nextId = 0;
  const pending = new Map<number, (outcome: WorkerOutcome) => void>();

  function stop(outcome: WorkerOutcome): void {
    worker?.terminate();
    worker = null;
    for (const settle of pending.values()) {
      settle(outcome);
    }
    pending.clear();
  }

  function start(): WorkerPort {
    const started = spawn();
    started.onmessage = (event) => {
      if (!isWorkerReply(event.data)) {
        stop({ status: 'failed', message: CRASH_MESSAGE });
        return;
      }
      const reply = event.data;
      const settle = pending.get(reply.id);
      pending.delete(reply.id);
      settle?.(
        reply.ok
          ? { status: 'done', result: reply.result }
          : { status: 'failed', message: reply.error },
      );
    };
    started.onerror = (event) => {
      stop({ status: 'failed', message: event.message === '' ? CRASH_MESSAGE : event.message });
    };
    return started;
  }

  return {
    run(task) {
      worker ??= start();
      const id = nextId++;
      const outcome = new Promise<WorkerOutcome>((resolve) => pending.set(id, resolve));
      worker.postMessage({ id, task });
      return outcome;
    },
    cancel() {
      stop({ status: 'cancelled' });
    },
  };
}
