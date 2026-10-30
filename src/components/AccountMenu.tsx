import { LogOutIcon, SettingsIcon, UserRoundIcon } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../hooks/authContext';
import { Avatar } from './Avatar';
import { BUTTON_STYLES } from './buttonStyles';
import { MENU_ROW } from './menuStyles';
import { ThemeSwitch } from './ThemeSwitch';
import { UnitToggle } from './UnitToggle';

/**
 * The top bar's menu: who is signed in, the account page, theme and units, and signing out.
 * Signed out, it holds the display settings, next to a way to sign in.
 */
export function AccountMenu() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  if (auth.state.status === 'checking') {
    return null;
  }
  const { user } = auth;

  function closeMenu(): void {
    menu.current?.hidePopover();
  }

  async function signOut(): Promise<void> {
    setError(null);
    const failure = await auth.signOut();
    if (failure === null) {
      closeMenu();
      await navigate('/');
    } else {
      setError(failure);
    }
  }

  return (
    <>
      {user === null && location.pathname !== '/sign-in' && (
        <span className="hidden md:block">
          <Link
            to="/sign-in"
            state={{ from: location.pathname }}
            className={`${BUTTON_STYLES.secondary} py-1 text-sm`}
          >
            Sign in
          </Link>
        </span>
      )}
      <button
        type="button"
        popoverTarget={menuId}
        aria-label={user === null ? 'Settings' : 'Account and settings'}
        title={user === null ? 'Settings' : (user.email ?? 'Your account')}
        className={
          user === null
            ? 'text-on-iron-muted hover:bg-hover hover:text-on-iron focus-visible:outline-brass-bright grid size-9 place-items-center rounded-sm focus-visible:outline-2'
            : 'focus-visible:outline-brass-bright rounded-full focus-visible:outline-2 focus-visible:outline-offset-2'
        }
      >
        {user === null ? (
          <SettingsIcon className="size-5" aria-hidden="true" />
        ) : (
          <Avatar email={user.email} />
        )}
      </button>
      <div
        id={menuId}
        ref={menu}
        popover="auto"
        className="parchment frame top-16 right-3 bottom-auto left-auto m-0 w-72 space-y-3 rounded-sm p-4"
      >
        {user !== null && (
          <div className="border-line space-y-1 border-b pb-3">
            <p className="text-muted truncate px-2.5 text-sm">{user.email ?? 'Signed in'}</p>
            <Link to="/account" onClick={closeMenu} className={MENU_ROW}>
              <UserRoundIcon className="text-muted size-4" aria-hidden="true" />
              Your account
            </Link>
          </div>
        )}
        <div className="space-y-2 px-1">
          <p className="text-muted text-xs font-medium">Theme</p>
          <ThemeSwitch />
        </div>
        <div className="space-y-2 px-1 lg:hidden">
          <p className="text-muted text-xs font-medium">Units</p>
          <UnitToggle />
        </div>
        <div className="border-line border-t pt-3">
          {user === null ? (
            <Link
              to="/sign-in"
              state={{ from: location.pathname }}
              onClick={closeMenu}
              className={`w-full ${BUTTON_STYLES.primary}`}
            >
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                void signOut();
              }}
              className={MENU_ROW}
            >
              <LogOutIcon className="text-muted size-4" aria-hidden="true" />
              Sign out
            </button>
          )}
          {error !== null && (
            <p role="alert" className="text-fail mt-2 px-2.5 text-sm">
              {error}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
