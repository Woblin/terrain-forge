import type { WorkspaceSlots } from './workspaceSlots';

/** The board with its name and toolbar above and its key below. */
export function BoardStage({
  notice,
  header,
  toolbar,
  boardAreaRef,
  board,
  footer,
}: WorkspaceSlots) {
  return (
    <section aria-label="Board editor" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
      {notice}
      {header}
      <div className="flex shrink-0 justify-center">{toolbar}</div>
      <div ref={boardAreaRef} className="flex min-h-0 flex-1 items-center justify-center">
        {board}
      </div>
      {/* On short screens, such as a phone held sideways, the board needs every pixel of height. */}
      <div className="shrink-0 [@media(max-height:560px)]:hidden">{footer}</div>
    </section>
  );
}
