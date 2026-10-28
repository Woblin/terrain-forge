import { useState } from 'react';
import { BoardToolTabs } from './BoardToolTabs';
import { BottomSheet, type SheetHeight } from './BottomSheet';
import type { WorkspaceSlots } from './workspaceSlots';

/** The board filling the screen, with everything else in a sheet pulled up from the bottom. */
export function PhoneWorkspace(props: WorkspaceSlots) {
  const { notice, boardAreaRef, board, phoneButtons, selectionBar, summary } = props;
  const [height, setHeight] = useState<SheetHeight>('peek');
  const hasSelection = selectionBar !== null;
  const [hadSelection, setHadSelection] = useState(hasSelection);
  // A piece just selected, such as one added from the Pieces tab, gets the board to itself.
  if (hasSelection !== hadSelection) {
    setHadSelection(hasSelection);
    if (hasSelection) {
      setHeight('peek');
    }
  }
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
        <BoardToolTabs {...props} />
      </BottomSheet>
    </main>
  );
}
