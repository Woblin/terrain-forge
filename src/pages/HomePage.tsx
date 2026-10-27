import { Link } from 'react-router';
import { AccountMenu } from '../components/AccountMenu';

export function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-2 bg-stone-900 text-stone-100">
      <div className="absolute top-3 right-4">
        <AccountMenu />
      </div>
      <h1 className="text-4xl font-bold">Terrain Forge</h1>
      <p className="text-stone-400">Balanced battlefields for tabletop wargames.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link
          to="/board"
          state={{ newBoard: true }}
          className="rounded bg-amber-500 px-4 py-2 font-semibold text-stone-950 hover:bg-amber-400"
        >
          New battlefield
        </Link>
        <Link
          to="/library"
          className="rounded border border-stone-500 px-4 py-2 font-semibold hover:bg-stone-800"
        >
          Your terrain
        </Link>
      </div>
    </main>
  );
}
