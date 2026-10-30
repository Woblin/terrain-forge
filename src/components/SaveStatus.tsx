import { CheckIcon } from 'lucide-react';
import { useOnline } from '../hooks/useOnline';

interface SaveStatusProps {
  /** True while changes are kept on this device and not saved yet. */
  saving: boolean;
}

/** Whether the player's changes have reached their account yet. */
export function SaveStatus({ saving }: SaveStatusProps) {
  const online = useOnline();
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1.5">
      {!saving && <CheckIcon className="text-pass size-4" aria-hidden="true" />}
      {statusText(saving, online)}
    </span>
  );
}

function statusText(saving: boolean, online: boolean): string {
  if (!saving) {
    return 'Saved to your account';
  }
  return online
    ? 'Saving…'
    : 'Not saved yet: you are offline. Changes are saved when you are back online.';
}
