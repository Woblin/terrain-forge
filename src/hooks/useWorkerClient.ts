import { useEffect, useRef, type RefObject } from 'react';
import { createWorkerClient, spawnBoardWorker, type WorkerClient } from '../services/workerClient';

/** A board worker client that lives as long as the component; null before mount. */
export function useWorkerClient(): RefObject<WorkerClient | null> {
  const client = useRef<WorkerClient | null>(null);
  useEffect(() => {
    const created = createWorkerClient(spawnBoardWorker);
    client.current = created;
    return () => {
      created.cancel();
      client.current = null;
    };
  }, []);
  return client;
}
