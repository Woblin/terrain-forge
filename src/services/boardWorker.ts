import { handleRequest, isWorkerRequest } from './boardWorkerProtocol';

// Runs generation and fairness analysis off the main thread, so the page stays responsive.
addEventListener('message', (event: MessageEvent<unknown>) => {
  if (isWorkerRequest(event.data)) {
    postMessage(handleRequest(event.data));
  } else {
    postMessage({
      id: -1,
      ok: false,
      error: 'The board worker got a message it does not understand.',
    });
  }
});
