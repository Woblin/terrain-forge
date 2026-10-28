import { useState } from 'react';
import { Tabs, type Tab } from './Tabs';
import { DETAILS_TITLE, type WorkspaceSlots } from './workspaceSlots';

type DetailsTab = 'fairness' | 'pieces';

/** How fair the board is, and the pieces to add, as two tabs. */
export function DetailsTabs({ fairness, pieces }: WorkspaceSlots) {
  const [tab, setTab] = useState<DetailsTab>('fairness');
  const tabs: Tab<DetailsTab>[] = [
    { id: 'fairness', label: 'Fairness', content: fairness },
    { id: 'pieces', label: 'Pieces', content: pieces },
  ];
  return (
    <Tabs label={DETAILS_TITLE} tabs={tabs} value={tab} onChange={setTab} panelClassName="pt-4" />
  );
}
