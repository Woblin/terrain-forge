import { ScaleIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import { useRulesRequest } from '../hooks/useRulesRequest';
import { BoardStage } from './BoardStage';
import { DetailsTabs } from './DetailsTabs';
import { SidePanel } from './SidePanel';
import { DETAILS_TITLE, SETUP_TITLE, type WorkspaceSlots } from './workspaceSlots';

type TabletPanel = 'setup' | 'details' | null;

/** The board with both panels as rails; one panel at a time slides over the board. */
export function TabletWorkspace(props: WorkspaceSlots) {
  const [open, setOpen] = useState<TabletPanel>(null);
  const [showRules, rulesShown] = useRulesRequest(props.rulesAsked);
  if (showRules && open !== 'details') {
    setOpen('details');
  }
  function openPanel(panel: TabletPanel, isOpen: boolean): void {
    setOpen(isOpen ? panel : null);
  }
  return (
    <main className="flex min-h-0 flex-1 gap-3 p-3">
      <SidePanel
        side="left"
        title={SETUP_TITLE}
        icon={SlidersHorizontalIcon}
        open={open === 'setup'}
        onOpenChange={(isOpen) => {
          openPanel('setup', isOpen);
        }}
        overlay
        widthClassName="w-80"
      >
        {props.setup}
      </SidePanel>
      <BoardStage {...props} />
      <SidePanel
        side="right"
        title={DETAILS_TITLE}
        icon={ScaleIcon}
        open={open === 'details'}
        onOpenChange={(isOpen) => {
          openPanel('details', isOpen);
        }}
        overlay
        widthClassName="w-[360px]"
      >
        <DetailsTabs {...props} showRules={showRules} onRulesShown={rulesShown} />
      </SidePanel>
    </main>
  );
}
