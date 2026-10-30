import { ScaleIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useEffect, useEffectEvent } from 'react';
import { useOpenPanels } from '../hooks/useOpenPanels';
import { useRulesRequest } from '../hooks/useRulesRequest';
import { BoardStage } from './BoardStage';
import { DetailsTabs } from './DetailsTabs';
import { SidePanel } from './SidePanel';
import { DETAILS_TITLE, SETUP_TITLE, type WorkspaceSlots } from './workspaceSlots';

/** The board between the setup and details panels, which fold to rails and stay that way. */
export function DesktopWorkspace(props: WorkspaceSlots) {
  const [panels, changePanels] = useOpenPanels();
  const [showRules, rulesShown] = useRulesRequest(props.rulesAsked);
  const openDetails = useEffectEvent(() => {
    if (!panels.details) {
      changePanels({ details: true });
    }
  });
  useEffect(() => {
    if (showRules) {
      openDetails();
    }
  }, [showRules]);
  return (
    <main className="flex min-h-0 flex-1 gap-3.5 p-3.5 min-[1920px]:gap-4 min-[1920px]:p-4">
      <SidePanel
        side="left"
        title={SETUP_TITLE}
        icon={SlidersHorizontalIcon}
        open={panels.setup}
        onOpenChange={(setup) => {
          changePanels({ setup });
        }}
        overlay={false}
        widthClassName="w-[300px] shrink-0"
      >
        {props.setup}
      </SidePanel>
      <BoardStage {...props} />
      <SidePanel
        side="right"
        title={DETAILS_TITLE}
        icon={ScaleIcon}
        open={panels.details}
        onOpenChange={(details) => {
          changePanels({ details });
        }}
        overlay={false}
        widthClassName="w-[360px] shrink-0 min-[1920px]:w-[400px]"
      >
        <DetailsTabs {...props} showRules={showRules} onRulesShown={rulesShown} />
      </SidePanel>
    </main>
  );
}
