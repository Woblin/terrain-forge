import { MountainIcon, ScaleIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRulesRequest } from '../hooks/useRulesRequest';
import { BoardStage } from './BoardStage';
import { focusRules } from './focusRules';
import { TabletPanel } from './TabletPanel';
import { TabletRail, type RailButton } from './TabletRail';
import { SETUP_TITLE, type WorkspaceSlots } from './workspaceSlots';

type TabletPanelId = 'setup' | 'fairness' | 'pieces';

const LEFT: readonly RailButton<TabletPanelId>[] = [
  { id: 'setup', label: SETUP_TITLE, icon: SlidersHorizontalIcon },
];
const RIGHT: readonly RailButton<TabletPanelId>[] = [
  { id: 'fairness', label: 'Fairness', icon: ScaleIcon },
  { id: 'pieces', label: 'Pieces', icon: MountainIcon },
];

/** The board between two labelled rails; one panel at a time slides over the board. */
export function TabletWorkspace(props: WorkspaceSlots) {
  const [open, setOpen] = useState<TabletPanelId | null>(null);
  const [showRules, rulesShown] = useRulesRequest(props.rulesAsked);
  if (showRules && open !== 'fairness') {
    setOpen('fairness');
  }
  useEffect(() => {
    if (showRules && open === 'fairness') {
      focusRules(props.rulesId);
      rulesShown();
    }
  });
  function toggle(id: TabletPanelId): void {
    setOpen(open === id ? null : id);
  }
  function close(): void {
    setOpen(null);
  }
  return (
    <main className="relative flex min-h-0 flex-1 gap-3 p-3">
      <TabletRail label="Board setup" buttons={LEFT} open={open} onToggle={toggle} />
      <BoardStage {...props} />
      <TabletRail label="Fairness and pieces" buttons={RIGHT} open={open} onToggle={toggle} />
      {open === 'setup' && (
        <TabletPanel id="setup" title={SETUP_TITLE} side="left" onClose={close}>
          {props.setup}
        </TabletPanel>
      )}
      {open === 'fairness' && (
        <TabletPanel id="fairness" title="Fairness" side="right" onClose={close}>
          {props.fairness}
        </TabletPanel>
      )}
      {open === 'pieces' && (
        <TabletPanel id="pieces" title="Pieces" side="right" onClose={close}>
          {props.pieces}
        </TabletPanel>
      )}
    </main>
  );
}
