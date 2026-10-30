import { CloudCheckIcon, CloudOffIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import type { SignInMethod } from '../domain/account';
import { Avatar } from '../components/Avatar';
import { BUTTON_STYLES } from '../components/buttonStyles';
import { DeleteAccountDialog } from '../components/DeleteAccountDialog';
import { ThemeSwitch } from '../components/ThemeSwitch';
import { UnitToggle } from '../components/UnitToggle';
import { useAuth } from '../hooks/authContext';
import type { Reauthentication } from '../services/auth';

const SECTIONS = [
  { id: 'profile', title: 'Profile' },
  { id: 'preferences', title: 'Preferences' },
  { id: 'delete-account', title: 'Delete account' },
] as const;

const CARD = 'parchment scroll-mt-20 flex flex-col rounded-sm px-6 py-[22px]';
const SETTING_ROW =
  'border-line flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border-t py-3.5 last:pb-0';
/** Wide, tall segments for the preferences, which have room for words. */
const SETTING_SEGMENTS = '[&>label]:h-9 [&>label]:min-w-24 [&>label]:px-3';

const METHOD_NAMES: Readonly<Record<SignInMethod, string>> = {
  google: 'Google',
  password: 'email and password',
};

/** The signed-in player's account: who they are, display preferences, and deleting it. */
export function AccountPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const current = SECTIONS.find((section) => `#${section.id}` === hash)?.id ?? 'profile';
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.state.status === 'checking') {
    return <p className="text-soft p-4">Loading…</p>;
  }
  const { user } = auth;
  if (user === null) {
    return <Navigate to="/sign-in" state={{ from: '/account' }} replace />;
  }

  async function confirmDelete(proof: Reauthentication): Promise<void> {
    setBusy(true);
    setError(null);
    const failure = await auth.deleteAccount(proof);
    setBusy(false);
    if (failure === null) {
      await navigate('/');
    } else {
      setError(failure);
    }
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-6 px-4 pt-6 pb-24 md:px-8 md:pt-9 md:pb-14">
        <h1 className="font-display text-on-iron-bright text-[32px] leading-tight md:text-4xl">
          Your account
        </h1>
        <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
          <nav aria-label="Account sections" className="hidden flex-[0_0_180px] md:block">
            <ul className="font-display sticky top-20 flex flex-col gap-0.5 text-lg">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={section.id === current ? 'location' : undefined}
                    className="text-on-iron-muted hover:text-on-iron aria-[current]:border-brass-bright aria-[current]:text-on-iron-bright focus-visible:outline-brass-bright block border-l-2 border-[#3a2c1a] px-3 py-2 focus-visible:outline-2"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex max-w-[700px] min-w-0 flex-[1_1_520px] flex-col gap-[22px]">
            <section
              id="profile"
              aria-labelledby="profile-heading"
              className={`${CARD} frame gap-4`}
            >
              <h2 id="profile-heading" className="font-display text-[22px]">
                Profile
              </h2>
              <div className="flex items-center gap-4">
                <Avatar
                  email={user.email}
                  className="size-[60px] text-[28px] shadow-[0_0_0_3px_var(--surface),0_0_0_4px_var(--color-brass)]"
                />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{user.email ?? 'No email'}</p>
                  <p className="text-muted mt-0.5">
                    Signs in with{' '}
                    {user.methods.map((method) => METHOD_NAMES[method]).join(' and ') ||
                      'an unknown method'}
                  </p>
                </div>
              </div>
              <p
                className={`flex items-center gap-2 rounded-[3px] border px-3 py-2 font-semibold ${user.emailVerified ? 'border-pass-line bg-pass-soft text-pass' : 'border-warn-line bg-warn-soft text-warn-ink'}`}
              >
                {user.emailVerified ? (
                  <CloudCheckIcon className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <CloudOffIcon className="size-4 shrink-0" aria-hidden="true" />
                )}
                {user.emailVerified
                  ? 'Your terrain and boards are saved to this account.'
                  : 'Your terrain is not saved until you verify your email.'}
              </p>
            </section>
            <section
              id="preferences"
              aria-labelledby="preferences-heading"
              className={`${CARD} frame gap-1.5`}
            >
              <h2 id="preferences-heading" className="font-display text-[22px]">
                Preferences
              </h2>
              <p className="text-muted mb-1.5">Kept on this device only.</p>
              <div className={SETTING_ROW}>
                <div>
                  <p className="font-bold" aria-hidden="true">
                    Theme
                  </p>
                  <p className="text-muted">System follows your device&apos;s setting.</p>
                </div>
                <ThemeSwitch labelled className={SETTING_SEGMENTS} />
              </div>
              <div className={SETTING_ROW}>
                <div>
                  <p className="font-bold" aria-hidden="true">
                    Units
                  </p>
                  <p className="text-muted">For sizes and distances everywhere.</p>
                </div>
                <UnitToggle labelled className={SETTING_SEGMENTS} />
              </div>
            </section>
            <section
              id="delete-account"
              aria-labelledby="delete-heading"
              className={`${CARD} frame-seal gap-3`}
            >
              <div>
                <h2 id="delete-heading" className="font-display text-accent-ink text-[22px]">
                  Delete your account
                </h2>
                <p className="text-muted mt-1">
                  Deletes the account with all your terrain pieces, photos and saved boards. This
                  can&apos;t be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setDeleting(true);
                }}
                className={`${BUTTON_STYLES.dangerOutline} h-[42px] self-start font-bold`}
              >
                <Trash2Icon className="size-4" aria-hidden="true" />
                Delete account
              </button>
            </section>
          </div>
        </div>
      </main>
      {deleting && (
        <DeleteAccountDialog
          usesPassword={user.methods.includes('password')}
          busy={busy}
          error={error}
          onConfirm={(proof) => {
            void confirmDelete(proof);
          }}
          onCancel={() => {
            setDeleting(false);
          }}
        />
      )}
    </>
  );
}
