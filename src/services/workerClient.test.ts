import { describe, expect, it } from 'vitest';
import type { WorkerReply, WorkerRequest, WorkerTask } from './boardWorkerProtocol';
import { createWorkerClient, type WorkerPort } from './workerClient';

class FakeWorker implements WorkerPort {
  readonly sent: WorkerRequest[] = [];
  terminated = false;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(message: WorkerRequest): void {
    this.sent.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(data: WorkerReply | string): void {
    this.onmessage?.({ data } as MessageEvent<unknown>);
  }

  crash(message: string): void {
    this.onerror?.({ message } as ErrorEvent);
  }
}

const task: WorkerTask = { kind: 'analyse', input: null as never };
const analysis = { kind: 'analyse', analysis: null as never } as const;

function setup() {
  const workers: FakeWorker[] = [];
  const client = createWorkerClient(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  });
  return { client, workers };
}

describe('createWorkerClient', () => {
  it('starts the worker on the first task and matches replies by id', async () => {
    const { client, workers } = setup();
    expect(workers).toHaveLength(0);
    const first = client.run(task);
    const second = client.run(task);
    const worker = workers[0];
    expect(worker?.sent.map((request) => request.id)).toEqual([0, 1]);
    worker?.reply({ id: 1, ok: false, error: 'boom' });
    worker?.reply({ id: 0, ok: true, result: analysis });
    await expect(first).resolves.toEqual({ status: 'done', result: analysis });
    await expect(second).resolves.toEqual({ status: 'failed', message: 'boom' });
  });

  it('cancels waiting tasks, stops the worker and starts a new one next time', async () => {
    const { client, workers } = setup();
    const running = client.run(task);
    client.cancel();
    await expect(running).resolves.toEqual({ status: 'cancelled' });
    expect(workers[0]?.terminated).toBe(true);
    void client.run(task);
    expect(workers).toHaveLength(2);
  });

  it('fails waiting tasks when the worker crashes', async () => {
    const { client, workers } = setup();
    const running = client.run(task);
    workers[0]?.crash('');
    await expect(running).resolves.toEqual({
      status: 'failed',
      message: 'The board worker stopped unexpectedly. Try again.',
    });
  });

  it('ignores replies to tasks that are no longer waiting', async () => {
    const { client, workers } = setup();
    const running = client.run(task);
    workers[0]?.reply({ id: 99, ok: true, result: analysis });
    workers[0]?.reply({ id: 0, ok: true, result: analysis });
    await expect(running).resolves.toEqual({ status: 'done', result: analysis });
  });
});
