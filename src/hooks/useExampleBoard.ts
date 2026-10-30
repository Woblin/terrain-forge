import { useEffect, useState } from 'react';
import { INITIAL_GAME_PREFERENCES, enabledRulesFor } from '../domain/gamePreferences';
import { resolveGameSetup, type GameSetup } from '../domain/gameSetup';
import type { FairnessReport } from '../domain/fairness';
import type { Layout } from '../domain/generator';
import { DEFAULT_PRESET_ID } from '../domain/presets';
import { SAMPLE_COLLECTION } from '../domain/sampleCollection';
import { DEFAULT_DEPLOYMENT_ID } from './boardSessionContext';
import { useGenerator } from './useGenerator';

/** The same example every visit, so the home page always shows the same board. */
const EXAMPLE_SEED = 20261027;

interface ExampleBoard {
  readonly setup: GameSetup | undefined;
  /** Null until the generator has finished, or when it failed. */
  readonly layout: Layout | null;
  readonly report: FairnessReport | null;
}

/** A board generated from the sample terrain with a fixed seed, to show what Terrain Forge makes. */
export function useExampleBoard(): ExampleBoard {
  const { generate } = useGenerator();
  const [example, setExample] = useState<Pick<ExampleBoard, 'layout' | 'report'>>({
    layout: null,
    report: null,
  });
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
        setExample({ layout: result.layout, report: result.report });
      }
    });
    return () => {
      current = false;
    };
  }, [generate, setup]);

  return { setup, ...example };
}
