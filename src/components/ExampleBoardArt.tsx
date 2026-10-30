import { findMat } from '../domain/mats';
import { SAMPLE_COLLECTION } from '../domain/sampleCollection';
import { useExampleBoard } from '../hooks/useExampleBoard';
import { BoardPicture } from './BoardPicture';
import { FairBadge } from './FairBadge';
import { WAR_TABLE } from './warTableStyles';

const EXAMPLE_MAT = findMat('grass');

/** An example board on a tilted war table, as artwork for the home and sign-in pages. */
export function ExampleBoardArt() {
  const example = useExampleBoard();
  if (example.setup === undefined) {
    return null;
  }
  return (
    <div
      aria-hidden="true"
      className={`w-full max-w-[760px] p-2.5 md:-rotate-2 md:p-3.5 ${WAR_TABLE}`}
    >
      <div className="relative">
        <BoardPicture
          setup={example.setup}
          layout={example.layout}
          pieces={SAMPLE_COLLECTION}
          mat={EXAMPLE_MAT}
        />
        <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgb(0_0_0/0.45)]" />
        {example.layout !== null && example.report !== null && (
          <div className="absolute top-2.5 right-2.5 hidden sm:block">
            <FairBadge report={example.report} enabledRules={example.layout.enabledRules} />
          </div>
        )}
      </div>
    </div>
  );
}
