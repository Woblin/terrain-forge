/** Says a saved board is open on the board page with changes that are not saved yet. */
export function UnsavedChangesNote() {
  return (
    <p className="text-accent-ink mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
      <span
        aria-hidden="true"
        className="size-[7px] shrink-0 rounded-full bg-[#e0a13a] shadow-[0_0_0_1px_var(--color-brass)]"
      />
      Open on the board, with unsaved changes
    </p>
  );
}
