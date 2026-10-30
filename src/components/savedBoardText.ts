import { resolveGameSetup } from '../domain/gameSetup';
import type { SavedBoard } from '../domain/savedBoard';

/** The game and deployment a saved board is for, in words. */
export function setupText(board: SavedBoard): string {
  const setup = resolveGameSetup(board.layout.presetId, board.layout.deploymentId);
  return setup === undefined
    ? 'A game Terrain Forge no longer knows'
    : `${setup.preset.name}, ${setup.deployment.name}`;
}

/** The day a board was saved, for example `29 Oct 2026`. */
export function savedDate(savedAt: number): string {
  return new Date(savedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
