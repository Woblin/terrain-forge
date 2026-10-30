import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import type { AccountDraft, AccountFormMode } from '../domain/account';
import { EmailForm } from '../components/EmailForm';
import { ExampleBoardArt } from '../components/ExampleBoardArt';
import { GoogleButton } from '../components/GoogleButton';
import { HERO_LAYOUT } from '../components/heroLayout';
import { useAuth } from '../hooks/authContext';
import { useMediaQuery } from '../hooks/useMediaQuery';

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
  // The artwork only shows on wide screens, so phones skip generating its board.
  const wide = useMediaQuery('(min-width: 1024px)');

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
    <main className={`${HERO_LAYOUT.page} pb-24 md:pb-12`}>
      <div className={HERO_LAYOUT.hero}>
        <section
          aria-labelledby="sign-in-heading"
          className="parchment frame flex max-w-[520px] flex-[1_1_420px] flex-col gap-5 rounded-sm px-5 pt-7 pb-6 md:px-[34px] md:pt-8 md:pb-7"
        >
          <div className="flex flex-col gap-1.5">
            <h1 id="sign-in-heading" className="font-display text-[34px] leading-[1.05]">
              Sign in
            </h1>
            <p className="text-muted text-pretty">
              Signing in saves your terrain library, photos and boards, so they are there on every
              device.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <GoogleButton
              label="Continue with Google"
              busy={busy === 'google'}
              onClick={() => {
                void run('google', auth.signInWithGoogle);
              }}
            />
            {error?.from === 'google' && (
              <p role="alert" className="text-fail text-sm">
                {error.message}
              </p>
            )}
          </div>
          <div className="text-faint flex items-center gap-3 italic" aria-hidden="true">
            <span className="bg-brass/60 h-px flex-1" />
            or
            <span className="bg-brass/60 h-px flex-1" />
          </div>
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
            <p className="text-muted -mt-1.5 text-xs">
              We send you an email to check the address. Your terrain is saved once you click the
              link in it.
            </p>
          )}
          <p className="border-brass/50 text-muted border-t pt-3.5 text-sm">
            You can also{' '}
            <Link to="/board" className="text-accent-ink hover:text-accent-ink-hover underline">
              use Terrain Forge without an account
            </Link>
            ; your terrain then lasts until you reload the page.
          </p>
        </section>
        {wide && (
          <div className={`${HERO_LAYOUT.art} flex-col items-center gap-[18px]`}>
            <ExampleBoardArt />
            <p aria-hidden="true" className="font-display text-soft pl-2 text-[22px]">
              Your terrain, your boards, on every device.
            </p>
          </div>
        )}
      </div>
    </main>
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
