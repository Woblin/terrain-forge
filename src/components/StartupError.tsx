interface StartupErrorProps {
  message: string;
}

export function StartupError({ message }: StartupErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-900 p-6 text-stone-100">
      <div role="alert" className="max-w-lg rounded-lg border border-red-400 bg-red-950 p-6">
        <h1 className="mb-2 text-xl font-semibold">Terrain Forge could not start</h1>
        <p className="text-red-200">{message}</p>
      </div>
    </main>
  );
}
