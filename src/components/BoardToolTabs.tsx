import { useState } from 'react';
import { Tabs, type Tab } from './Tabs';
import { SETUP_TITLE, type WorkspaceSlots } from './workspaceSlots';

type ToolTab = 'setup' | 'fairness' | 'pieces';

/** Setup, Fairness and Pieces as three tabs, for phones where they share one panel. */
export function BoardToolTabs({ setup, fairness, pieces, legend }: WorkspaceSlots) {
  const [tab, setTab] = useState<ToolTab>('setup');
  const tabs: Tab<ToolTab>[] = [
    { id: 'setup', label: SETUP_TITLE, content: setup },
    { id: 'fairness', label: 'Fairness', content: fairness },
    {
      id: 'pieces',
      label: 'Pieces',
      content: (
        <div className="space-y-4">
          {pieces}
          <div className="border-line text-muted space-y-3 border-t pt-3 text-sm">
            <p>
              Tap a piece to select it. Drag to move it, drag the yellow handle to turn it, or drop
              it off the board to remove it.
            </p>
            {legend}
          </div>
        </div>
      ),
    },
  ];
  return (
    <Tabs
      label="Board tools"
      tabs={tabs}
      value={tab}
      onChange={setTab}
      panelClassName="min-h-0 flex-1 overflow-y-auto"
    />
  );
}
