interface EmptyLibraryProps {
  busy: boolean;
  onAddSample: () => void;
}

/** What the library page shows before the player has added any terrain. */
export function EmptyLibrary({ busy, onAddSample }: EmptyLibraryProps) {
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-stone-600 p-6 text-center">
      <p>Your library is empty.</p>
      <p className="text-sm text-stone-400">
        Add the pieces you own one by one, or start from the sample set and change it to match your
        table.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onAddSample}
        className="rounded border border-stone-500 px-3 py-1.5 hover:bg-stone-700 disabled:opacity-50"
      >
        Add the sample set
      </button>
    </div>
  );
}
