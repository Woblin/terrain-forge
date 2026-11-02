import type { BoardChoice } from '../domain/boardSource';
import type { MatId } from '../domain/mats';
import type { GameSystemPreset } from '../domain/presets';
import type { LengthUnit } from '../domain/units';
import type { GeneratorStatus } from '../hooks/useGenerator';
import { GeneratorControls } from './GeneratorControls';
import { MatAccordion } from './MatAccordion';

interface BoardSetupPanelProps {
  preset: GameSystemPreset;
  choice: BoardChoice;
  status: GeneratorStatus;
  unit: LengthUnit;
  /** How many balance rules the next board must pass. */
  ruleCount: number;
  settingsError: string | null;
  /** False on phones, where Generate sits in the sheet's summary row instead. */
  showGenerate: boolean;
  mat: MatId;
  matDarkness: number;
  onPresetChange: (presetId: string) => void;
  onDeploymentChange: (deploymentId: string) => void;
  onGenerate: () => void;
  onChooseRules: () => void;
  onMatChange: (mat: MatId) => void;
  onMatDarknessChange: (darkness: number) => void;
}

/** The game, deployment and mat for the next board, and the button that makes it. */
export function BoardSetupPanel({
  preset,
  choice,
  status,
  unit,
  ruleCount,
  settingsError,
  showGenerate,
  mat,
  matDarkness,
  onPresetChange,
  onDeploymentChange,
  onGenerate,
  onChooseRules,
  onMatChange,
  onMatDarknessChange,
}: BoardSetupPanelProps) {
  return (
    <div className="space-y-6">
      <GeneratorControls
        preset={preset}
        deploymentId={choice.deploymentId}
        status={status}
        unit={unit}
        ruleCount={ruleCount}
        settingsError={settingsError}
        onPresetChange={onPresetChange}
        onDeploymentChange={onDeploymentChange}
        onGenerate={onGenerate}
        onChooseRules={onChooseRules}
        showGenerate={showGenerate}
      />
      <MatAccordion
        value={mat}
        onChange={onMatChange}
        darkness={matDarkness}
        onDarknessChange={onMatDarknessChange}
      />
    </div>
  );
}
