import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import type { AccountDraft, AccountFormMode } from '../domain/account';
import { AppHeader } from '../components/AppHeader';
import { EmailForm } from '../components/EmailForm';
import { GoogleButton } from '../components/GoogleButton';
import { useAuth } from '../hooks/authContext';

const RESET_SENT =
  'If there is an account for that email, a reset link is on its way. Check your inbox.';

/** Sign in with Google or an email address, or create an email account. */
export function SignInPage() {
  const auth = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<AccountFormMode>('signIn');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<{ from: 'google' | 'email'; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (auth.user !== null) {
    return <Navigate to={returnPath(location.state)} replace />;
  }

  async function run(which: 'google' | 'email', action: () => Promise<string | null>) {
    setBusy(which);
    setError(null);
    setNotice(null);
    const failure = await action();
    setBusy(null);
    setError(failure === null ? null : { from: which, message: failure });
    return failure;
  }

  async function submitEmail(submitted: AccountFormMode, draft: AccountDraft): Promise<void> {
    if (submitted === 'resetPassword') {
      const failure = await run('email', () => auth.sendPasswordReset(draft.email));
      if (failure === null) {
        setNotice(RESET_SENT);
      }
      return;
    }
    await run('email', () =>
      submitted === 'createAccount'
        ? auth.createAccount(draft.email, draft.password)
        : auth.signInWithEmail(draft.email, draft.password),
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <AppHeader />
      <main className="mx-auto max-w-sm space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-stone-400">
            Signing in saves your terrain library and photos, so they are there on every device.
          </p>
        </div>
        <GoogleButton
          label="Continue with Google"
          busy={busy === 'google'}
          onClick={() => {
            void run('google', auth.signInWithGoogle);
          }}
        />
        {error?.from === 'google' && (
          <p role="alert" className="text-sm text-red-300">
            {error.message}
          </p>
        )}
        <p className="text-center text-sm text-stone-400">or</p>
        <EmailForm
          mode={mode}
          busy={busy !== null}
          error={error?.from === 'email' ? error.message : null}
          notice={notice}
          onModeChange={(next) => {
            setMode(next);
            setError(null);
            setNotice(null);
          }}
          onSubmit={(submitted, draft) => {
            void submitEmail(submitted, draft);
          }}
        />
        {mode === 'createAccount' && (
          <p className="text-sm text-stone-400">
            We send you an email to check the address. Your terrain is saved once you click the link
            in it.
          </p>
        )}
        <p className="text-sm text-stone-400">
          You can also{' '}
          <Link to="/board" className="text-amber-300 underline hover:text-amber-200">
            use Terrain Forge without an account
          </Link>
          ; your terrain then lasts until you reload the page.
        </p>
      </main>
    </div>
  );
}

/** Back to the page the player came from, without the board link it had, or to their terrain. */
function returnPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return '/library';
  }
  const { from } = state;
  return typeof from === 'string' && from.startsWith('/') && from !== '/sign-in'
    ? from
    : '/library';
}
