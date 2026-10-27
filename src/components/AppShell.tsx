import { Link, Outlet, useLocation } from 'react-router';
import { AccountMenu } from './AccountMenu';
import { LogoMark } from './LogoMark';
import { MainNav } from './MainNav';
import { pageTitle } from './navItems';
import { TabBar } from './TabBar';
import { UnitToggle } from './UnitToggle';
import { VerifyEmailBanner } from './VerifyEmailBanner';

/**
 * The frame around every page: a top bar, and on phones a tab bar along the bottom. Pages
 * fill the whole width and choose their own inner layout.
 */
export function AppShell() {
  const location = useLocation();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-line bg-canvas/85 sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-13 items-center gap-3 px-3 md:h-14 md:gap-6 md:px-4">
          <Link
            to="/"
            aria-label="Terrain Forge home"
            className="focus-visible:outline-accent-ink flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <LogoMark />
            <span className="hidden text-[15px] font-semibold tracking-tight md:inline">
              Terrain Forge
            </span>
          </Link>
          <p className="text-[17px] font-semibold tracking-tight md:hidden">
            {pageTitle(location.pathname)}
          </p>
          <MainNav className="hidden md:flex" />
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <UnitToggle className="hidden lg:flex" />
            <AccountMenu />
          </div>
        </div>
      </header>
      <VerifyEmailBanner />
      <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </div>
      <TabBar className="md:hidden" />
    </div>
  );
}
