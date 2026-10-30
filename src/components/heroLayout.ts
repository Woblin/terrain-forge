/**
 * The page and hero grid the home and sign-in pages share, so nothing jumps when moving
 * between them: text or form on the left, the example board on the right.
 */
export const HERO_LAYOUT = {
  page: 'mx-auto flex w-full max-w-[1480px] flex-1 flex-col px-4 md:px-10',
  hero: 'flex flex-wrap items-center gap-x-16 gap-y-10 pt-8 md:pt-16',
  text: 'flex max-w-[560px] flex-[1_1_420px] flex-col',
  art: 'flex min-w-0 flex-[1_1_560px] justify-center',
} as const;
