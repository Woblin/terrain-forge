import { standardDeployments, type Board, type DeploymentMap } from './board';
import { findPreset, type GameSystemPreset } from './presets';

/** The game system, board and deployment a layout is generated for. */
export interface GameSetup {
  readonly preset: GameSystemPreset;
  readonly board: Board;
  readonly deployment: DeploymentMap;
}

/** The deployments offered for a game system, on its default board. */
export function deploymentsFor(preset: GameSystemPreset): DeploymentMap[] {
  return standardDeployments(preset.defaultBoard, preset.zoneDepth);
}

export function resolveGameSetup(presetId: string, deploymentId: string): GameSetup | undefined {
  const preset = findPreset(presetId);
  const deployment =
    preset === undefined
      ? undefined
      : deploymentsFor(preset).find((candidate) => candidate.id === deploymentId);
  if (preset === undefined || deployment === undefined) {
    return undefined;
  }
  return { preset, board: preset.defaultBoard, deployment };
}
