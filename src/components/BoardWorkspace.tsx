import type { BoardLayout } from '../hooks/useBoardLayout';
import { DesktopWorkspace } from './DesktopWorkspace';
import { PhoneWorkspace } from './PhoneWorkspace';
import { SidewaysWorkspace } from './SidewaysWorkspace';
import { TabletWorkspace } from './TabletWorkspace';
import type { WorkspaceSlots } from './workspaceSlots';

interface BoardWorkspaceProps extends WorkspaceSlots {
  layout: BoardLayout;
}

/**
 * The board page's layout: the board between two side panels on wide screens, the same panels
 * sliding over the board on tablets, a sheet pulled up from the bottom on phones, and a panel
 * beside the board on phones held sideways.
 */
export function BoardWorkspace({ layout, ...slots }: BoardWorkspaceProps) {
  switch (layout) {
    case 'desktop':
      return <DesktopWorkspace {...slots} />;
    case 'tablet':
      return <TabletWorkspace {...slots} />;
    case 'phone':
      return <PhoneWorkspace {...slots} />;
    case 'sideways':
      return <SidewaysWorkspace {...slots} />;
  }
}
