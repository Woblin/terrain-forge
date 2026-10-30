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
    <nav aria-label="Main" className={`font-display gap-1.5 text-[17px] ${className}`}>
      {navItemsFor(user !== null).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `focus-visible:outline-brass-bright border-b-2 px-3 py-1.5 focus-visible:outline-2 ${isActive ? 'border-brass-bright text-[#f3e6c4]' : 'text-on-iron-muted hover:text-on-iron border-transparent'}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
