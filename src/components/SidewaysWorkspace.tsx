import { BoardToolTabs } from './BoardToolTabs';
import type { WorkspaceSlots } from './workspaceSlots';

/**
 * A phone held sideways: the board at full height on the left and the board tools in a panel
 * on the right, since a sheet from the bottom would leave the board no room.
 */
export function SidewaysWorkspace(props: WorkspaceSlots) {
  const { notice, boardAreaRef, board, phoneButtons, selectionBar, measureBar, summary } = props;
  return (
    <main className="flex min-h-0 flex-1 gap-3 py-2 pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))]">
      <section aria-label="Board editor" className="relative flex min-h-0 min-w-0 flex-1 gap-2">
        <div ref={boardAreaRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
          {board}
        </div>
        {/* Beside the board rather than over it: held sideways, the board fills the height. */}
        <div className="shrink-0">{phoneButtons}</div>
        {notice !== null && <div className="absolute top-0 right-14 left-0 z-10">{notice}</div>}
      </section>
      <aside
        aria-label="Board tools"
        className="border-line bg-surface flex w-80 shrink-0 flex-col gap-3 rounded-2xl border p-3 shadow-sm min-[800px]:w-[22rem]"
      >
        {/* The selected piece's tools take the summary's place, so they never cover the board. */}
        {measureBar}
        {selectionBar ?? summary}
        <BoardToolTabs {...props} />
      </aside>
    </main>
  );
}
