import { LogInIcon, UserRoundIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { useAuth } from '../hooks/authContext';
import { navItemsFor } from './navItems';

interface TabBarProps {
  className?: string;
}

const ICON = 'size-[22px]';

/** The main pages as a tab bar along the bottom of a phone screen, in reach of a thumb. */
export function TabBar({ className = '' }: TabBarProps) {
  const auth = useAuth();
  const location = useLocation();
  const signedIn = auth.user !== null;
  return (
    <nav
      aria-label="Main"
      className={`border-brass bg-iron fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] ${className}`}
    >
      <ul className="flex">
        {navItemsFor(signedIn).map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink to={item.to} className={tabClasses}>
              <item.icon className={ICON} aria-hidden="true" />
              {item.shortLabel}
            </NavLink>
          </li>
        ))}
        {auth.state.status !== 'checking' && (
          <li className="flex-1">
            {signedIn ? (
              <NavLink to="/account" className={tabClasses}>
                <UserRoundIcon className={ICON} aria-hidden="true" />
                Account
              </NavLink>
            ) : (
              <NavLink to="/sign-in" state={{ from: location.pathname }} className={tabClasses}>
                <LogInIcon className={ICON} aria-hidden="true" />
                Sign in
              </NavLink>
            )}
          </li>
        )}
      </ul>
    </nav>
  );
}

function tabClasses({ isActive }: { isActive: boolean }): string {
  return `-mt-px flex h-16 flex-col items-center justify-center gap-1 border-t-2 text-[13px] font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass-bright ${isActive ? 'border-brass-bright text-brass-glow' : 'border-transparent text-on-iron-muted hover:text-on-iron'}`;
}
