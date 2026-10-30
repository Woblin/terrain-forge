import { useEffect, useState } from 'react';
import { focusRules } from './focusRules';
import { Tabs, type Tab } from './Tabs';
import { DETAILS_TITLE, type WorkspaceSlots } from './workspaceSlots';

type DetailsTab = 'fairness' | 'pieces';

interface DetailsTabsProps extends WorkspaceSlots {
  /** True while the player has asked to see the balance rules and they are not focused yet. */
  showRules: boolean;
  onRulesShown: () => void;
}

/** How fair the board is, and the pieces to add, as two tabs. */
export function DetailsTabs({
  fairness,
  pieces,
  rulesId,
  showRules,
  onRulesShown,
}: DetailsTabsProps) {
  const [tab, setTab] = useState<DetailsTab>('fairness');
  if (showRules && tab !== 'fairness') {
    setTab('fairness');
  }
  useEffect(() => {
    if (showRules && tab === 'fairness') {
      focusRules(rulesId);
      onRulesShown();
    }
  });
  const tabs: Tab<DetailsTab>[] = [
    { id: 'fairness', label: 'Fairness', content: fairness },
    { id: 'pieces', label: 'Pieces', content: pieces },
  ];
  return (
    <Tabs label={DETAILS_TITLE} tabs={tabs} value={tab} onChange={setTab} panelClassName="pt-4" />
  );
}
