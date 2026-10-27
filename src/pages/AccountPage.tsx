import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import type { SignInMethod } from '../domain/account';
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
      <main className="mx-auto max-w-xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">Your account</h1>
        <dl className="border-line bg-surface grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl border p-4 text-sm shadow-sm">
          <dt className="text-muted">Email</dt>
          <dd>{user.email ?? 'None'}</dd>
          <dt className="text-muted">Signs in with</dt>
          <dd>{user.methods.map((method) => METHOD_NAMES[method]).join(', ') || 'Unknown'}</dd>
          <dt className="text-muted">Terrain saved</dt>
          <dd>{user.emailVerified ? 'Yes' : 'Not until you verify your email'}</dd>
        </dl>
        <section aria-labelledby="delete-heading" className="space-y-2">
          <h2 id="delete-heading" className="text-lg font-semibold">
            Delete your account
          </h2>
          <p className="text-muted text-sm">
            Deletes the account with all your terrain pieces, photos and saved boards.
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDeleting(true);
            }}
            className="border-fail-line text-fail hover:bg-fail-soft rounded-lg border px-3 py-1.5"
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
    </>
  );
}
