import { SAMPLE_COLLECTION } from '../domain/sampleCollection';
import { useExampleBoard } from '../hooks/useExampleBoard';
import { BoardPicture } from './BoardPicture';

/** The left half of the sign-in page on wide screens: an example board as artwork. */
export function ExampleBoardArt() {
  const example = useExampleBoard();
  return (
    <div
      aria-hidden="true"
      className="bg-mat relative flex flex-col justify-center gap-8 overflow-hidden p-12 xl:p-16"
    >
      {example.setup !== undefined && (
        <div className="shadow-shade -rotate-2 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
          <BoardPicture setup={example.setup} layout={example.layout} pieces={SAMPLE_COLLECTION} />
        </div>
      )}
      <div className="max-w-lg space-y-2 text-zinc-100">
        <p className="text-2xl font-semibold tracking-tight">
          Fair battlefields from your own terrain.
        </p>
        <p className="text-zinc-400">
          Save your terrain once, and every board you generate is built from what is on your shelf.
        </p>
      </div>
    </div>
  );
}
