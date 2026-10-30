import { useEffect, useState } from 'react';
import { useRulesRequest } from '../hooks/useRulesRequest';
import { focusRules } from './focusRules';
import { Tabs, type Tab } from './Tabs';
import { SETUP_TITLE, type WorkspaceSlots } from './workspaceSlots';

type ToolTab = 'setup' | 'fairness' | 'pieces';

/** Setup, Fairness and Pieces as three tabs, for phones where they share one panel. */
export function BoardToolTabs({
  header,
  setup,
  fairness,
  pieces,
  legend,
  rulesAsked,
  rulesId,
}: WorkspaceSlots) {
  const [tab, setTab] = useState<ToolTab>('setup');
  const [showRules, rulesShown] = useRulesRequest(rulesAsked);
  if (showRules && tab !== 'fairness') {
    setTab('fairness');
  }
  useEffect(() => {
    if (showRules && tab === 'fairness') {
      focusRules(rulesId);
      rulesShown();
    }
  });
  const tabs: Tab<ToolTab>[] = [
    {
      id: 'setup',
      label: SETUP_TITLE,
      content: (
        <div className="space-y-5">
          <div className="on-leather bg-iron-raised rounded-sm p-3">{header}</div>
          {setup}
        </div>
      ),
    },
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
      panelClassName="relative min-h-0 flex-1 overflow-y-auto pt-3"
    />
  );
}
