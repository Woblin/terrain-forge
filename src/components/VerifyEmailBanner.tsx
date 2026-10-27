import { useState } from 'react';
import { useAuth } from '../hooks/authContext';
import { TextButton } from './TextButton';

/** Asks a player with an email account to verify it, since only then is their terrain saved. */
export function VerifyEmailBanner() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);

  if (auth.user === null || auth.user.emailVerified) {
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
      className="border-warn-line bg-warn-soft text-warn-ink border-b px-4 py-2 text-sm"
    >
      <p>
        Verify your email to save your terrain. We sent a link to {auth.user.email ?? 'you'}. Until
        you click it, your library lasts until you reload the page.{' '}
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
          Send the email again
        </TextButton>
      </p>
      {message !== null && (
        <p className={message.failed ? 'text-fail' : 'text-pass'}>{message.text}</p>
      )}
    </div>
  );
}
