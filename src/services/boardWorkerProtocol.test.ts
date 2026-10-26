import { describe, expect, it } from 'vitest';
import { fairnessInputFor } from '../domain/boardAnalysis';
import { resolveGameSetup } from '../domain/gameSetup';
import { SAMPLE_COLLECTION } from '../domain/sampleCollection';
import { handleRequest, isWorkerReply, isWorkerRequest } from './boardWorkerProtocol';

const setup = resolveGameSetup('warhammer-40k', 'long-edges');
if (setup === undefined) {
  throw new Error('Missing the 40k setup');
}

describe('handleRequest', () => {
  it('generates a layout', () => {
    const reply = handleRequest({
      id: 3,
      task: {
        kind: 'generate',
        request: {
          board: setup.board,
          pieces: SAMPLE_COLLECTION,
          preset: setup.preset,
          deployment: setup.deployment,
          seed: 5,
        },
      },
    });
    expect(reply).toMatchObject({
      id: 3,
      ok: true,
      result: { kind: 'generate', result: { ok: true } },
    });
  }, 60_000);

  it('analyses a board', () => {
    const input = fairnessInputFor(setup, SAMPLE_COLLECTION, [
      { pieceId: 'building', position: { x: 30, y: 22 }, rotation: 0 },
    ]);
    const reply = handleRequest({ id: 4, task: { kind: 'analyse', input } });
    expect(reply).toMatchObject({ id: 4, ok: true, result: { kind: 'analyse' } });
  });

  it('turns a thrown error into an error reply', () => {
    const input = fairnessInputFor(setup, SAMPLE_COLLECTION, []);
    const broken = { ...input, terrain: null } as unknown as typeof input;
    const reply = handleRequest({ id: 5, task: { kind: 'analyse', input: broken } });
    expect(reply).toMatchObject({ id: 5, ok: false });
  });
});

describe('message guards', () => {
  it('accepts only well-formed requests and replies', () => {
    expect(isWorkerRequest({ id: 1, task: { kind: 'analyse' } })).toBe(true);
    expect(isWorkerRequest({ id: 1, task: { kind: 'paint' } })).toBe(false);
    expect(isWorkerRequest(null)).toBe(false);
    expect(isWorkerReply({ id: 1, ok: false, error: 'x' })).toBe(true);
    expect(isWorkerReply({ id: '1', ok: true })).toBe(false);
  });
});
