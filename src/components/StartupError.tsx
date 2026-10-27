interface StartupErrorProps {
  message: string;
}

export function StartupError({ message }: StartupErrorProps) {
  return (
    <main className="bg-canvas text-ink flex min-h-screen items-center justify-center p-6">
      <div role="alert" className="border-fail-line bg-fail-soft max-w-lg rounded-lg border p-6">
        <h1 className="mb-2 text-xl font-semibold">Terrain Forge could not start</h1>
        <p className="text-fail">{message}</p>
      </div>
    </main>
  );
}
