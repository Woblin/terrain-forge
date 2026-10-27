import { HandIcon, MountainIcon, ScaleIcon, SparklesIcon, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { BoardPicture } from '../components/BoardPicture';
import { BUTTON_STYLES } from '../components/buttonStyles';
import { SAMPLE_COLLECTION } from '../domain/sampleCollection';
import { useExampleBoard } from '../hooks/useExampleBoard';

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
  const example = useExampleBoard();
  return (
    <main className="flex-1">
      <section className="grid items-center gap-10 px-4 pt-8 pb-12 md:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-16 lg:py-20">
        <div className="max-w-xl space-y-6">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
            Fair battlefields from your own terrain.
          </h1>
          <p className="text-muted text-lg">
            Balanced terrain layouts for Warhammer, Age of Sigmar, One Page Rules and more, in a
            second. Tweak them by hand and save them for game night.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/board" state={{ newBoard: true }} className={BUTTON_STYLES.primary}>
              <SparklesIcon className="size-[18px]" aria-hidden="true" />
              New battlefield
            </Link>
            <Link to="/library" className={BUTTON_STYLES.secondary}>
              Your terrain
            </Link>
          </div>
        </div>
        {example.setup !== undefined && (
          <div className="shadow-shade ring-line overflow-hidden rounded-3xl shadow-2xl ring-1 lg:-rotate-2">
            <BoardPicture
              setup={example.setup}
              layout={example.layout}
              pieces={SAMPLE_COLLECTION}
            />
          </div>
        )}
      </section>
      <section aria-label="What Terrain Forge does" className="px-4 pb-16 md:px-8 lg:px-16">
        <ul className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="border-line bg-surface space-y-2 rounded-2xl border p-5 shadow-sm"
            >
              <feature.icon className="text-accent-ink size-6" aria-hidden="true" />
              <h2 className="font-semibold">{feature.title}</h2>
              <p className="text-muted text-sm">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
