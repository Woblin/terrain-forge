import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../hooks/authContext';

/** Who is signed in, with a way to their account and out; or a way to sign in. */
export function AccountMenu() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (auth.state.status === 'checking') {
    return null;
  }
  if (auth.user === null) {
    return (
      <Link
        to="/sign-in"
        state={{ from: location.pathname }}
        className="rounded border border-stone-500 px-3 py-1 text-sm font-semibold hover:bg-stone-800"
      >
        Sign in
      </Link>
    );
  }

  async function signOut(): Promise<void> {
    setError(null);
    const failure = await auth.signOut();
    if (failure === null) {
      await navigate('/');
    } else {
      setError(failure);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        to="/account"
        className="max-w-48 truncate rounded px-2 py-1 text-stone-300 hover:bg-stone-800"
        title="Your account"
      >
        {auth.user.email ?? 'Your account'}
      </Link>
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
        className="rounded border border-stone-500 px-3 py-1 hover:bg-stone-800"
      >
        Sign out
      </button>
      {error !== null && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
