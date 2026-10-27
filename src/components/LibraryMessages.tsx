interface LibraryMessagesProps {
  loadError: string | null;
  problems: readonly string[];
  actionError: string | null;
  loading: boolean;
}

/** Loading state and anything that went wrong with the library. */
export function LibraryMessages({
  loadError,
  problems,
  actionError,
  loading,
}: LibraryMessagesProps) {
  return (
    <div aria-live="polite" className="space-y-2 text-sm">
      {loading && <p className="text-stone-300">Loading…</p>}
      {[loadError, actionError, ...problems].map(
        (message) =>
          message !== null && (
            <p key={message} role="alert" className="text-red-300">
              {message}
            </p>
          ),
      )}
    </div>
  );
}
