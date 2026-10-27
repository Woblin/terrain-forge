import { Link } from 'react-router';

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-stone-900 text-stone-100">
      <h1 className="text-4xl font-bold">Terrain Forge</h1>
      <p className="text-stone-400">Balanced battlefields for tabletop wargames.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link
          to="/board"
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
