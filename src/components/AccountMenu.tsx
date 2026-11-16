import { LogOutIcon, SettingsIcon, UserRoundIcon } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { signOutLossMessage } from '../domain/account';
import { boardWorkAtRisk } from '../domain/savedBoard';
import { useAuth } from '../hooks/authContext';
import { useBoardSession } from '../hooks/boardSessionContext';
import { useTerrainLibrary } from '../hooks/libraryContext';
import { Avatar } from './Avatar';
import { BUTTON_STYLES } from './buttonStyles';
import { ConfirmDialog } from './ConfirmDialog';
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
  const [confirming, setConfirming] = useState(false);
  const library = useTerrainLibrary();
  const session = useBoardSession();
  const lossMessage = signOutLossMessage(
    library.persistent ? 0 : library.pieces.length,
    boardWorkAtRisk(session.opened, session.editor.present, session.mat),
  );

  if (auth.state.status === 'checking') {
    return null;
  }
  const { user } = auth;

  function closeMenu(): void {
    menu.current?.hidePopover();
  }

  /** Signs out at once, or first asks when that would lose work kept only in this tab. */
  function requestSignOut(): void {
    if (lossMessage === null) {
      void signOut();
    } else {
      closeMenu();
      setConfirming(true);
    }
  }

  async function signOut(): Promise<void> {
    setConfirming(false);
    setError(null);
    const failure = await auth.signOut();
    if (failure === null) {
      closeMenu();
      await navigate('/');
    } else {
      setError(failure);
      // After the question the menu is closed; open it again so the message is seen.
      if (menu.current?.matches(':popover-open') === false) {
        menu.current.showPopover();
      }
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
            <button type="button" onClick={requestSignOut} className={MENU_ROW}>
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
      {confirming && lossMessage !== null && (
        <ConfirmDialog
          title="Sign out without saving?"
          message={lossMessage}
          confirmLabel="Sign out"
          busy={false}
          error={null}
          onConfirm={() => {
            void signOut();
          }}
          onCancel={() => {
            setConfirming(false);
          }}
        />
      )}
    </>
  );
}
