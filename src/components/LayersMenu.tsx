import { Switch } from './Switch';

export interface LayerSettings {
  readonly snap: boolean;
  readonly movePairs: boolean;
  readonly showPhotos: boolean;
  readonly showLane: boolean;
  readonly showHidden: boolean;
}

interface LayersMenuProps {
  settings: LayerSettings;
  onChange: (change: Partial<LayerSettings>) => void;
}

/** What the board shows and how pieces move, for screens without room for a toolbar. */
export function LayersMenu({ settings, onChange }: LayersMenuProps) {
  return (
    <fieldset>
      <legend className="sr-only">Board options</legend>
      <Switch
        checked={settings.snap}
        onChange={(snap) => {
          onChange({ snap });
        }}
      >
        Snap to grid and 15° steps
      </Switch>
      <Switch
        checked={settings.movePairs}
        onChange={(movePairs) => {
          onChange({ movePairs });
        }}
      >
        Move pairs together
      </Switch>
      <Switch
        checked={settings.showPhotos}
        onChange={(showPhotos) => {
          onChange({ showPhotos });
        }}
      >
        Photos
      </Switch>
      <Switch
        checked={settings.showLane}
        onChange={(showLane) => {
          onChange({ showLane });
        }}
      >
        Longest clear lane
      </Switch>
      <Switch
        checked={settings.showHidden}
        onChange={(showHidden) => {
          onChange({ showHidden });
        }}
      >
        Hidden deployment areas
      </Switch>
    </fieldset>
  );
}
