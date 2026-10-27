import { Link, NavLink } from 'react-router';
import { AccountMenu } from './AccountMenu';
import { UnitToggle } from './UnitToggle';
import { VerifyEmailBanner } from './VerifyEmailBanner';

const NAV = [
  { to: '/board', label: 'Board' },
  { to: '/library', label: 'Your terrain' },
] as const;

/** The bar at the top of every page: home, the main pages, the unit setting and the account. */
export function AppHeader() {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/" className="text-lg font-bold hover:text-amber-300">
            Terrain Forge
          </Link>
          <nav aria-label="Main" className="flex gap-1 text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded px-2 py-1 hover:bg-stone-800 ${isActive ? 'text-amber-300' : 'text-stone-300'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <UnitToggle />
          <AccountMenu />
        </div>
      </header>
      <VerifyEmailBanner />
    </>
  );
}
