import { useEffect, useState } from 'react';
import { INITIAL_GAME_PREFERENCES, enabledRulesFor } from '../domain/gamePreferences';
import { resolveGameSetup, type GameSetup } from '../domain/gameSetup';
import type { Layout } from '../domain/generator';
import { DEFAULT_PRESET_ID } from '../domain/presets';
import { SAMPLE_COLLECTION } from '../domain/sampleCollection';
import { DEFAULT_DEPLOYMENT_ID } from './boardSessionContext';
import { useGenerator } from './useGenerator';

/** The same example every visit, so the home page always shows the same board. */
const EXAMPLE_SEED = 20261027;

/**
 * A board generated from the sample terrain with a fixed seed, to show what Terrain Forge
 * makes. The layout is null until the generator has finished, or when it failed.
 */
export function useExampleBoard(): { setup: GameSetup | undefined; layout: Layout | null } {
  const { generate } = useGenerator();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [setup] = useState(() => resolveGameSetup(DEFAULT_PRESET_ID, DEFAULT_DEPLOYMENT_ID));

  useEffect(() => {
    if (setup === undefined) {
      return;
    }
    let current = true;
    void generate({
      board: setup.board,
      pieces: SAMPLE_COLLECTION,
      preset: setup.preset,
      deployment: setup.deployment,
      seed: EXAMPLE_SEED,
      enabledRules: enabledRulesFor(setup.preset, INITIAL_GAME_PREFERENCES),
    }).then((result) => {
      if (current && result?.ok === true) {
        setLayout(result.layout);
      }
    });
    return () => {
      current = false;
    };
  }, [generate, setup]);

  return { setup, layout };
}
