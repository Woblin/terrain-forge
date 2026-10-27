import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import type { SignInMethod } from '../domain/account';
import { AppHeader } from '../components/AppHeader';
import { DeleteAccountDialog } from '../components/DeleteAccountDialog';
import { useAuth } from '../hooks/authContext';
import type { Reauthentication } from '../services/auth';

const METHOD_NAMES: Readonly<Record<SignInMethod, string>> = {
  google: 'Google',
  password: 'Email and password',
};

/** The signed-in player's account: who they are, and deleting it. */
export function AccountPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.state.status === 'checking') {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100">
        <AppHeader />
        <p className="p-4 text-stone-300">Loading…</p>
      </div>
    );
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
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <AppHeader />
      <main className="mx-auto max-w-xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">Your account</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-stone-800 p-4 text-sm">
          <dt className="text-stone-400">Email</dt>
          <dd>{user.email ?? 'None'}</dd>
          <dt className="text-stone-400">Signs in with</dt>
          <dd>{user.methods.map((method) => METHOD_NAMES[method]).join(', ') || 'Unknown'}</dd>
          <dt className="text-stone-400">Terrain saved</dt>
          <dd>{user.emailVerified ? 'Yes' : 'Not until you verify your email'}</dd>
        </dl>
        <section aria-labelledby="delete-heading" className="space-y-2">
          <h2 id="delete-heading" className="text-lg font-semibold">
            Delete your account
          </h2>
          <p className="text-sm text-stone-400">
            Deletes the account with all your terrain pieces, photos and saved boards.
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDeleting(true);
            }}
            className="rounded border border-red-500 px-3 py-1.5 text-red-300 hover:bg-red-950"
          >
            Delete account
          </button>
        </section>
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
    </div>
  );
}
