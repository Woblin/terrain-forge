import { useState } from 'react';
import { BottomSheet, type SheetHeight } from './BottomSheet';
import { Tabs, type Tab } from './Tabs';
import { SETUP_TITLE, type WorkspaceSlots } from './workspaceSlots';

type SheetTab = 'setup' | 'fairness' | 'pieces';

/** The board filling the screen, with everything else in a sheet pulled up from the bottom. */
export function PhoneWorkspace({
  notice,
  setup,
  fairness,
  pieces,
  boardAreaRef,
  board,
  phoneButtons,
  selectionBar,
  summary,
}: WorkspaceSlots) {
  const [height, setHeight] = useState<SheetHeight>('peek');
  const [tab, setTab] = useState<SheetTab>('setup');
  const tabs: Tab<SheetTab>[] = [
    { id: 'setup', label: SETUP_TITLE, content: setup },
    { id: 'fairness', label: 'Fairness', content: fairness },
    { id: 'pieces', label: 'Pieces', content: pieces },
  ];
  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <section aria-label="Board editor" className="flex min-h-0 flex-1 flex-col">
        <div
          ref={boardAreaRef}
          className="flex min-h-0 flex-1 items-center justify-center p-3 pb-[5.5rem]"
        >
          {board}
        </div>
        <div className="absolute top-3 right-3 z-10">{phoneButtons}</div>
        {notice !== null && <div className="absolute top-3 right-17 left-3 z-10">{notice}</div>}
        {selectionBar !== null && height === 'peek' && (
          <div className="absolute inset-x-3 bottom-[5.5rem] z-10">{selectionBar}</div>
        )}
      </section>
      <BottomSheet label="Board tools" height={height} onHeightChange={setHeight} summary={summary}>
        <Tabs
          label="Board tools"
          tabs={tabs}
          value={tab}
          onChange={setTab}
          panelClassName="min-h-0 flex-1 overflow-y-auto"
        />
      </BottomSheet>
    </main>
  );
}
