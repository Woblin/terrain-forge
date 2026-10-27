import { Link, useLocation } from 'react-router';

interface NotSavedNoteProps {
  /** True when the player is signed in but has not verified their email yet. */
  signedIn: boolean;
}

/** Tells the player their library only lasts until a reload, and how to save it. */
export function NotSavedNote({ signedIn }: NotSavedNoteProps) {
  const location = useLocation();
  return (
    <p className="rounded-lg border border-amber-400/50 bg-amber-950/50 p-3 text-sm text-amber-100">
      Your library isn&apos;t saved: it lasts until you reload the page.{' '}
      {signedIn ? (
        'Verify your email to save it to your account.'
      ) : (
        <>
          <Link
            to="/sign-in"
            state={{ from: location.pathname }}
            className="text-amber-300 underline hover:text-amber-200"
          >
            Sign in
          </Link>{' '}
          to keep it, with its photos.
        </>
      )}
    </p>
  );
}
