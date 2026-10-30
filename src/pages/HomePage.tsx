import { HandIcon, MountainIcon, ScaleIcon, SparklesIcon, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { BUTTON_STYLES } from '../components/buttonStyles';
import { ExampleBoardArt } from '../components/ExampleBoardArt';
import { HeroRule } from '../components/HeroRule';
import { RecentBoards } from '../components/RecentBoards';
import { HERO_LAYOUT } from '../components/heroLayout';

const FEATURES: readonly { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ScaleIcon,
    title: 'Fair to both sides',
    text: 'Every board is checked against balance rules for cover, sight lines and terrain in each half.',
  },
  {
    icon: MountainIcon,
    title: 'Your own terrain',
    text: 'Add the pieces on your shelf once, and boards are built from exactly what you own.',
  },
  {
    icon: HandIcon,
    title: 'Yours to adjust',
    text: 'Drag, turn and swap pieces by hand, and see straight away whether the board is still fair.',
  },
];

export function HomePage() {
  return (
    <main className={`${HERO_LAYOUT.page} gap-14 pb-24 md:pb-16`}>
      <section className={HERO_LAYOUT.hero}>
        <div className={`${HERO_LAYOUT.text} gap-[22px]`}>
          <HeroRule>For tabletop wargames</HeroRule>
          <h1 className="font-display text-on-iron-bright text-[40px] leading-[1.04] text-balance md:text-[56px]">
            Fair battlefields from your own terrain.
          </h1>
          <p className="text-soft text-[19px] leading-[1.45] text-pretty md:text-xl">
            Balanced terrain layouts for Warhammer, Age of Sigmar, One Page Rules and more, in a
            second. Tweak them by hand and save them for game night.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              to="/board"
              state={{ newBoard: true }}
              className={`${BUTTON_STYLES.primary} h-[50px] gap-2.5 px-[22px] text-[21px]`}
            >
              <SparklesIcon className="size-[18px]" aria-hidden="true" />
              New battlefield
            </Link>
            <Link
              to="/library"
              className={`${BUTTON_STYLES.secondary} border-brass h-[50px] px-5 text-lg`}
            >
              Your terrain
            </Link>
          </div>
        </div>
        <div className={HERO_LAYOUT.art}>
          <ExampleBoardArt />
        </div>
      </section>
      <RecentBoards />
      <section aria-label="What Terrain Forge does">
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="parchment frame flex flex-col gap-2.5 rounded-sm px-[22px] pt-[22px] pb-6"
            >
              <span
                aria-hidden="true"
                className="bg-seal text-on-seal grid size-11 place-items-center rounded-full shadow-[0_0_0_2px_var(--surface),0_0_0_3px_var(--color-brass)]"
              >
                <feature.icon className="size-[22px]" />
              </span>
              <h2 className="font-display text-[22px]">{feature.title}</h2>
              <p className="text-soft text-base leading-[1.45]">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
