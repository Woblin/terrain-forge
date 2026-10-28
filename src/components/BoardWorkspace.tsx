import type { BoardLayout } from '../hooks/useBoardLayout';
import { DesktopWorkspace } from './DesktopWorkspace';
import { PhoneWorkspace } from './PhoneWorkspace';
import { TabletWorkspace } from './TabletWorkspace';
import type { WorkspaceSlots } from './workspaceSlots';

interface BoardWorkspaceProps extends WorkspaceSlots {
  layout: BoardLayout;
}

/**
 * The board page's layout: the board between two side panels on wide screens, the same panels
 * sliding over the board on tablets, and a sheet pulled up from the bottom on phones.
 */
export function BoardWorkspace({ layout, ...slots }: BoardWorkspaceProps) {
  if (layout === 'phone') {
    return <PhoneWorkspace {...slots} />;
  }
  return layout === 'desktop' ? <DesktopWorkspace {...slots} /> : <TabletWorkspace {...slots} />;
}
