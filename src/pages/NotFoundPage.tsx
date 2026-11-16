import { Link } from 'react-router';
import { BUTTON_STYLES } from '../components/buttonStyles';

/** What an address that Terrain Forge has no page for shows, with the way back. */
export function NotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-start gap-4 px-4 pt-10 pb-24 md:px-8">
      <h1 className="font-display text-on-iron-bright text-[32px] leading-tight">
        There is no page here
      </h1>
      <p className="text-soft">
        The address may be mistyped, or the link may be from an older version of Terrain Forge.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link to="/board" className={BUTTON_STYLES.primary}>
          Go to the board
        </Link>
        <Link to="/" className={BUTTON_STYLES.secondary}>
          Home
        </Link>
      </div>
    </main>
  );
}
