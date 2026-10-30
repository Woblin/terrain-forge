import { CloudCheckIcon, CloudOffIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
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

const CARD = 'parchment frame scroll-mt-20 space-y-4 rounded-sm p-6';
const SETTING_ROW =
  'flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between';

const METHOD_NAMES: Readonly<Record<SignInMethod, string>> = {
  google: 'Google',
  password: 'email and password',
};

/** The signed-in player's account: who they are, display preferences, and deleting it. */
export function AccountPage() {
  const auth = useAuth();
  const navigate = useNavigate();
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
      <main className="flex-1 px-4 py-6 md:px-8 lg:py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight md:text-3xl">Your account</h1>
        <div className="md:grid md:grid-cols-[11rem_minmax(0,42rem)] md:gap-10">
          <nav aria-label="Account sections" className="hidden md:block">
            <ul className="sticky top-20 space-y-1 text-sm">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-soft hover:bg-hover hover:text-ink focus-visible:outline-accent-ink block rounded-lg px-3 py-2 focus-visible:outline-2"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-6">
            <section id="profile" aria-labelledby="profile-heading" className={CARD}>
              <h2 id="profile-heading" className="font-display text-[22px]">
                Profile
              </h2>
              <div className="flex items-center gap-4">
                <Avatar email={user.email} className="size-14 text-xl" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.email ?? 'No email'}</p>
                  <p className="text-muted text-sm">
                    Signs in with{' '}
                    {user.methods.map((method) => METHOD_NAMES[method]).join(' and ') ||
                      'an unknown method'}
                  </p>
                </div>
              </div>
              <p
                className={`flex items-center gap-2 text-sm ${user.emailVerified ? 'text-pass' : 'text-warn-ink'}`}
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
            <section id="preferences" aria-labelledby="preferences-heading" className={CARD}>
              <div>
                <h2 id="preferences-heading" className="font-display text-[22px]">
                  Preferences
                </h2>
                <p className="text-muted text-sm">Kept on this device only.</p>
              </div>
              <div className="divide-line divide-y">
                <div className={SETTING_ROW}>
                  <div>
                    <p className="text-sm font-medium" aria-hidden="true">
                      Theme
                    </p>
                    <p className="text-muted text-xs">System follows your device&apos;s setting.</p>
                  </div>
                  <ThemeSwitch labelled className="sm:w-72" />
                </div>
                <div className={SETTING_ROW}>
                  <div>
                    <p className="text-sm font-medium" aria-hidden="true">
                      Units
                    </p>
                    <p className="text-muted text-xs">For sizes and distances everywhere.</p>
                  </div>
                  <UnitToggle labelled className="sm:w-72" />
                </div>
              </div>
            </section>
            <section
              id="delete-account"
              aria-labelledby="delete-heading"
              className={`${CARD} border-fail-line`}
            >
              <div>
                <h2 id="delete-heading" className="font-display text-[22px]">
                  Delete your account
                </h2>
                <p className="text-muted text-sm">
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
                className={`${BUTTON_STYLES.secondary} border-fail-line text-fail hover:bg-fail-soft`}
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
