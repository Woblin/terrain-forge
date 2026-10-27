interface EmptyLibraryProps {
  busy: boolean;
  onAddSample: () => void;
}

/** What the library page shows before the player has added any terrain. */
export function EmptyLibrary({ busy, onAddSample }: EmptyLibraryProps) {
  return (
    <div className="border-line-strong space-y-3 rounded-lg border border-dashed p-6 text-center">
      <p>Your library is empty.</p>
      <p className="text-muted text-sm">
        Add the pieces you own one by one, or start from the sample set and change it to match your
        table.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onAddSample}
        className="border-line-strong hover:bg-hover rounded-lg border px-3 py-1.5 disabled:opacity-50"
      >
        Add the sample set
      </button>
    </div>
  );
}
