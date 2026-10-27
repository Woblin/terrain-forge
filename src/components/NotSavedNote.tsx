import { Link, useLocation } from 'react-router';

interface NotSavedNoteProps {
  /** True when the player is signed in but has not verified their email yet. */
  signedIn: boolean;
}

/** Tells the player their library only lasts until a reload, and how to save it. */
export function NotSavedNote({ signedIn }: NotSavedNoteProps) {
  const location = useLocation();
  return (
    <p className="border-warn-line bg-warn-soft text-warn-ink rounded-lg border p-3 text-sm">
      Your library isn&apos;t saved: it lasts until you reload the page.{' '}
      {signedIn ? (
        'Verify your email to save it to your account.'
      ) : (
        <>
          <Link
            to="/sign-in"
            state={{ from: location.pathname }}
            className="text-accent-ink hover:text-accent-ink-hover underline"
          >
            Sign in
          </Link>{' '}
          to keep it, with its photos.
        </>
      )}
    </p>
  );
}
