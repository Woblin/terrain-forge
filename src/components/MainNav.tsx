import { NavLink } from 'react-router';
import { useAuth } from '../hooks/authContext';
import { navItemsFor } from './navItems';

interface MainNavProps {
  className?: string;
}

/** The main pages as tabs in the top bar, for screens wide enough to show them there. */
export function MainNav({ className = '' }: MainNavProps) {
  const { user } = useAuth();
  return (
    <nav aria-label="Main" className={`gap-1 text-sm ${className}`}>
      {navItemsFor(user !== null).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `focus-visible:outline-accent-ink rounded-lg px-3 py-1.5 font-medium focus-visible:outline-2 ${isActive ? 'bg-hover text-ink' : 'text-muted hover:text-ink'}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
