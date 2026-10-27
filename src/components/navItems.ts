import { BookmarkIcon, MountainIcon, Grid3x3Icon, type LucideIcon } from 'lucide-react';

export interface NavItem {
  readonly to: string;
  readonly label: string;
  /** The shorter label under the icon in the phone tab bar. */
  readonly shortLabel: string;
  readonly icon: LucideIcon;
  readonly signedInOnly: boolean;
}

/** The app's main pages, in the order they appear in the navigation. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/board', label: 'Board', shortLabel: 'Board', icon: Grid3x3Icon, signedInOnly: false },
  {
    to: '/library',
    label: 'Your terrain',
    shortLabel: 'Terrain',
    icon: MountainIcon,
    signedInOnly: false,
  },
  {
    to: '/boards',
    label: 'My boards',
    shortLabel: 'Boards',
    icon: BookmarkIcon,
    signedInOnly: true,
  },
];

/** The navigation shown to a signed-in or signed-out player. */
export function navItemsFor(signedIn: boolean): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => signedIn || !item.signedInOnly);
}

/** The heading the phone top bar shows for a page. */
export function pageTitle(pathname: string): string {
  const item = NAV_ITEMS.find((candidate) => candidate.to === pathname);
  if (item !== undefined) {
    return item.label;
  }
  if (pathname === '/sign-in') {
    return 'Sign in';
  }
  if (pathname === '/account') {
    return 'Account';
  }
  return 'Terrain Forge';
}
