import { useOnline } from '../hooks/useOnline';

interface SaveStatusProps {
  /** True while changes are kept on this device and not saved yet. */
  saving: boolean;
}

/** Tells the player when their changes have not reached their account yet. */
export function SaveStatus({ saving }: SaveStatusProps) {
  const online = useOnline();
  return (
    <p aria-live="polite" className="text-muted text-sm">
      {saving &&
        (online
          ? 'Saving…'
          : 'Not saved yet: you are offline. Changes are saved when you are back online.')}
    </p>
  );
}
