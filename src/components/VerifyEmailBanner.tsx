import { MailWarningIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/authContext';
import { IconButton } from './IconButton';
import { TextButton } from './TextButton';

/** Asks a player with an email account to verify it, since only then is their terrain saved. */
export function VerifyEmailBanner() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  // Hidden until the page is reloaded; the account page still says the terrain is not saved.
  const [hidden, setHidden] = useState(false);

  if (auth.user === null || auth.user.emailVerified || hidden) {
    return null;
  }

  async function run(action: () => Promise<string | null>, success: string | null) {
    setBusy(true);
    setMessage(null);
    const failure = await action();
    setBusy(false);
    if (failure !== null) {
      setMessage({ text: failure, failed: true });
    } else if (success !== null) {
      setMessage({ text: success, failed: false });
    }
  }

  return (
    <div
      role="status"
      className="border-warn-line bg-warn-soft text-warn-ink flex items-start gap-2 border-b py-1 pr-1 pl-4 text-sm md:items-center"
    >
      <MailWarningIcon className="mt-2 size-4 shrink-0 md:mt-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 py-1.5">
        <p>
          Verify your email to save your terrain: we sent a link to {auth.user.email ?? 'you'}.{' '}
          <TextButton
            disabled={busy}
            onClick={() => {
              void run(auth.refreshVerification, null);
            }}
          >
            I have verified it
          </TextButton>{' '}
          ·{' '}
          <TextButton
            disabled={busy}
            onClick={() => {
              void run(auth.resendVerification, 'Sent. Check your inbox and spam folder.');
            }}
          >
            Send it again
          </TextButton>
        </p>
        {message !== null && (
          <p className={message.failed ? 'text-fail' : 'text-pass'}>{message.text}</p>
        )}
      </div>
      <IconButton
        icon={XIcon}
        label="Hide this message"
        onClick={() => {
          setHidden(true);
        }}
      />
    </div>
  );
}
