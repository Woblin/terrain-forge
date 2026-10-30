import { Link, Outlet, useLocation } from 'react-router';
import { AccountMenu } from './AccountMenu';
import { LogoMark } from './LogoMark';
import { MainNav } from './MainNav';
import { fillsWindow, pageTitle } from './navItems';
import { TabBar } from './TabBar';
import { UnitToggle } from './UnitToggle';
import { VerifyEmailBanner } from './VerifyEmailBanner';

/**
 * The frame around every page: a top bar, and on phones a tab bar along the bottom. Pages
 * fill the whole width and choose their own inner layout; the board page also fills the height.
 */
export function AppShell() {
  const location = useLocation();
  const fixedHeight = fillsWindow(location.pathname);
  return (
    <div className={`flex flex-col ${fixedHeight ? 'h-dvh' : 'min-h-dvh'}`}>
      <header className="border-brass bg-iron text-on-iron sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] shadow-[0_1px_0_#3a2c1a,0_4px_14px_rgb(0_0_0/0.45)]">
        <div className="flex h-13 items-center gap-3 px-3 md:h-15 md:gap-7 md:px-[18px]">
          <Link
            to="/"
            aria-label="Terrain Forge home"
            className="focus-visible:outline-brass-bright flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <LogoMark className="h-[30px] w-[26px] md:h-[34px] md:w-[30px]" />
            <span className="font-display hidden text-[26px] leading-none tracking-[0.5px] md:inline">
              Terrain Forge
            </span>
          </Link>
          <p className="font-display text-[22px] leading-none md:hidden">
            {pageTitle(location.pathname)}
          </p>
          <MainNav className="hidden md:flex" />
          <div className="ml-auto flex items-center gap-2 md:gap-3.5">
            <UnitToggle tone="iron" className="hidden lg:flex" />
            <AccountMenu />
          </div>
        </div>
      </header>
      <VerifyEmailBanner />
      <div
        className={`flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 ${fixedHeight ? 'min-h-0' : ''}`}
      >
        <Outlet />
      </div>
      <TabBar className="md:hidden" />
    </div>
  );
}
