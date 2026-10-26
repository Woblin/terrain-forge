import { resolveGameSetup } from './gameSetup';
import { GENERATOR_VERSION } from './generator';
import { codeToSeed, seedToCode } from './random';

/** What a share link carries: enough to generate the same board again. */
export interface BoardLink {
  readonly presetId: string;
  readonly deploymentId: string;
  readonly seed: number;
  readonly generatorVersion: number;
}

export type ParsedBoardLink =
  | { readonly kind: 'empty' }
  | { readonly kind: 'valid'; readonly link: BoardLink; readonly versionMismatch: boolean }
  | { readonly kind: 'invalid'; readonly reason: string };

const PARAMS = { preset: 'system', deployment: 'deploy', seed: 'seed', version: 'v' } as const;

export function boardLinkSearch(link: BoardLink): string {
  return new URLSearchParams([
    [PARAMS.preset, link.presetId],
    [PARAMS.deployment, link.deploymentId],
    [PARAMS.seed, seedToCode(link.seed)],
    [PARAMS.version, String(link.generatorVersion)],
  ]).toString();
}

export function parseBoardLink(search: string): ParsedBoardLink {
  const params = new URLSearchParams(search);
  const presetId = params.get(PARAMS.preset);
  const deploymentId = params.get(PARAMS.deployment);
  const seedCode = params.get(PARAMS.seed);
  if (presetId === null && deploymentId === null && seedCode === null) {
    return { kind: 'empty' };
  }
  if (presetId === null || deploymentId === null || seedCode === null) {
    return invalid('This board link is incomplete.');
  }
  if (resolveGameSetup(presetId, deploymentId) === undefined) {
    return invalid(
      'This board link names a game system or deployment Terrain Forge does not know.',
    );
  }
  const seed = codeToSeed(seedCode);
  if (seed === null) {
    return invalid(`"${seedCode}" is not a valid board code.`);
  }
  const generatorVersion = parseVersion(params.get(PARAMS.version));
  if (generatorVersion === null) {
    return invalid('This board link has an unknown generator version.');
  }
  return {
    kind: 'valid',
    link: { presetId, deploymentId, seed, generatorVersion },
    versionMismatch: generatorVersion !== GENERATOR_VERSION,
  };
}

/** A missing version means the link was made by this version. */
function parseVersion(value: string | null): number | null {
  if (value === null) {
    return GENERATOR_VERSION;
  }
  return /^[1-9][0-9]*$/.test(value) ? Number(value) : null;
}

function invalid(reason: string): ParsedBoardLink {
  return { kind: 'invalid', reason };
}
