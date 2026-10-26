import { Link } from 'react-router';

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-stone-900 text-stone-100">
      <h1 className="text-4xl font-bold">Terrain Forge</h1>
      <p className="text-stone-400">Balanced battlefields for tabletop wargames.</p>
      <Link
        to="/board"
        className="mt-4 rounded bg-amber-500 px-4 py-2 font-semibold text-stone-950 hover:bg-amber-400"
      >
        New battlefield
      </Link>
    </main>
  );
}
