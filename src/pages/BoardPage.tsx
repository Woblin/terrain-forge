import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { boardCentre } from '../domain/board';
import { fairnessInputFor } from '../domain/boardAnalysis';
import { checkBoard } from '../domain/boardChecks';
import { canRedo, canUndo, type BoardPiece, type PieceUpdate } from '../domain/editor';
import { resolveGameSetup, type GameSetup } from '../domain/gameSetup';
import { add, type Point } from '../domain/geometry';
import { pieceById } from '../domain/layoutTerrain';
import { findMirrorTwin, withTwin } from '../domain/mirror';
import type { PlacementRules } from '../domain/placement';
import { findPreset, PRESETS, type GameSystemPreset } from '../domain/presets';
import { seedToCode } from '../domain/random';
import { SAMPLE_COLLECTION } from '../domain/sampleCollection';
import { boardLinkSearch, parseBoardLink, type ParsedBoardLink } from '../domain/shareLink';
import { normalizeRotation, snapRotation } from '../domain/snapping';
import type { Placement, TerrainPiece } from '../domain/terrain';
import { formatLength } from '../domain/units';
import { BoardView } from '../components/BoardView';
import { DeploymentZones } from '../components/DeploymentZones';
import { EditorToolbar } from '../components/EditorToolbar';
import { FairnessPanel } from '../components/FairnessPanel';
import { GeneratorControls } from '../components/GeneratorControls';
import { HiddenAreaOverlay } from '../components/HiddenAreaOverlay';
import { LaneOverlay } from '../components/LaneOverlay';
import { PhotoCropper } from '../components/PhotoCropper';
import { PiecePalette } from '../components/PiecePalette';
import { pieceLabel } from '../components/pieceLabel';
import { RotateHandle } from '../components/RotateHandle';
import { SeedField } from '../components/SeedField';
import { TerrainLegend } from '../components/TerrainLegend';
import { TerrainShape } from '../components/TerrainShape';
import { UnitToggle } from '../components/UnitToggle';
import { copyText } from '../services/clipboard';
import { useBoardAnalysis } from '../hooks/useBoardAnalysis';
import { useBoardDrag } from '../hooks/useBoardDrag';
import { useEditorKeys } from '../hooks/useEditorKeys';
import { useElementWidth } from '../hooks/useElementWidth';
import { randomSeed, useGenerator } from '../hooks/useGenerator';
import { useLayoutEditor } from '../hooks/useLayoutEditor';
import { usePhotoEditor } from '../hooks/usePhotoEditor';
import { useTerrainImages } from '../hooks/useTerrainImages';
import { useUnits } from '../hooks/unitsContext';

/** Until players have their own library, every board uses the built-in collection. */
const COLLECTION = SAMPLE_COLLECTION;
const DEFAULT_PRESET = PRESETS[0] as GameSystemPreset;
const DEFAULT_DEPLOYMENT_ID = 'long-edges';
const NO_PIECES: readonly BoardPiece[] = [];

/** Sizes that stay easy to hit with a finger whatever the board's scale, in CSS pixels. */
const HIT_OUTLINE_PX = 24;
const HANDLE_RADIUS_PX = 11;
const HANDLE_GAP_PX = 30;

interface BoardChoice {
  readonly presetId: string;
  readonly deploymentId: string;
}

/** Generate a board, see how fair it is, and edit it by hand. */
export function BoardPage() {
  const { unit } = useUnits();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialLink] = useState(() => parseBoardLink(searchParams.toString()));
  const [choice, setChoice] = useState(() => initialChoice(initialLink));
  const [notice, setNotice] = useState(() => linkNotice(initialLink));
  const [editor, dispatch] = useLayoutEditor();
  const { status, generate } = useGenerator();
  const [warnings, setWarnings] = useState<readonly string[]>([]);
  const [snap, setSnap] = useState(true);
  const [movePairs, setMovePairs] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showLane, setShowLane] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const images = useTerrainImages();
  const photoEditor = usePhotoEditor(images.setPhoto);
  const svgRef = useRef<SVGSVGElement>(null);
  const boardPixels = useElementWidth(svgRef);

  const { present } = editor;
  const origin = present?.origin;
  const pieces = present?.pieces ?? NO_PIECES;
  const setup = useMemo(
    () =>
      origin === undefined ? undefined : resolveGameSetup(origin.presetId, origin.deploymentId),
    [origin],
  );
  const chosenPreset = findPreset(choice.presetId) ?? DEFAULT_PRESET;
  const board = setup?.board ?? chosenPreset.defaultBoard;
  const inchesPerPixel = boardPixels > 0 ? board.width / boardPixels : 0.1;

  const drag = useBoardDrag(
    svgRef,
    {
      pieces,
      board,
      collection: COLLECTION,
      edgeMargin: setup?.preset.edgeMargin ?? 0,
      unit,
      snap,
      movePairs,
    },
    dispatch,
  );
  const shownPieces = useMemo(() => withPreview(pieces, drag.preview), [pieces, drag.preview]);
  const fairnessInput = useMemo(
    () =>
      setup === undefined
        ? null
        : fairnessInputFor(
            setup,
            COLLECTION,
            shownPieces.map((piece) => piece.placement),
          ),
    [setup, shownPieces],
  );
  const analysis = useBoardAnalysis(fairnessInput);
  const problems = useMemo(
    () =>
      setup === undefined
        ? new Map<string, readonly string[]>()
        : checkBoard(shownPieces, COLLECTION, placementRules(setup), unit),
    [setup, shownPieces, unit],
  );

  async function runGeneration(next: BoardChoice, seed: number): Promise<void> {
    const target = resolveGameSetup(next.presetId, next.deploymentId);
    if (target === undefined) {
      return;
    }
    const result = await generate({
      board: target.board,
      pieces: COLLECTION,
      preset: target.preset,
      deployment: target.deployment,
      seed,
    });
    if (result?.ok === true) {
      dispatch({ type: 'generated', layout: result.layout });
      setWarnings(result.warnings);
    }
  }

  function generateNew(seed: number): void {
    setNotice(null);
    void runGeneration(choice, seed);
  }

  const generateFirstBoard = useEffectEvent(() => {
    const seed = initialLink.kind === 'valid' ? initialLink.link.seed : randomSeed();
    void runGeneration(choice, seed);
  });
  useEffect(() => {
    // Starting the first generation hands work to the board worker, an outside system; the
    // generator's own status is what changes synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generateFirstBoard();
  }, []);

  useEffect(() => {
    if (origin === undefined) {
      return;
    }
    const search = boardLinkSearch(origin);
    if (searchParams.toString() !== search) {
      setSearchParams(search, { replace: true });
    }
  }, [origin, searchParams, setSearchParams]);

  const selected = pieces.find((piece) => piece.key === editor.selected);
  const shownSelected = shownPieces.find((piece) => piece.key === editor.selected);

  function updateSelected(change: (placement: Placement) => Omit<PieceUpdate, 'key'>): void {
    if (selected === undefined) {
      return;
    }
    const update = { key: selected.key, ...change(selected.placement) };
    const twin = movePairs ? findMirrorTwin(pieces, selected.key, board) : undefined;
    dispatch({ type: 'placed', updates: withTwin(update, twin, board) });
  }

  function nudge(delta: Point): void {
    updateSelected(({ position, rotation }) => ({ position: add(position, delta), rotation }));
  }

  function turn(degrees: number): void {
    updateSelected(({ position, rotation }) => ({
      position,
      rotation: snap ? snapRotation(rotation + degrees) : normalizeRotation(rotation + degrees),
    }));
  }

  function removeSelected(): void {
    if (selected !== undefined) {
      dispatch({ type: 'removed', key: selected.key });
    }
  }

  function addPiece(piece: TerrainPiece): void {
    dispatch({ type: 'added', piece, position: boardCentre(board), rotation: 0 });
  }

  useEditorKeys(svgRef, {
    undo: () => {
      dispatch({ type: 'undo' });
    },
    redo: () => {
      dispatch({ type: 'redo' });
    },
    nudge,
    turn,
    remove: removeSelected,
    escape: () => {
      drag.cancel();
      dispatch({ type: 'selected', key: null });
    },
  });

  const selectedPiece =
    shownSelected === undefined
      ? undefined
      : pieceById(COLLECTION, shownSelected.placement.pieceId);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 px-4 py-3">
        <Link to="/" className="text-lg font-bold hover:text-amber-300">
          Terrain Forge
        </Link>
        <UnitToggle />
      </header>
      <main className="mx-auto grid max-w-[96rem] gap-4 p-4 lg:grid-cols-[16rem_minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <GeneratorControls
            preset={chosenPreset}
            deploymentId={choice.deploymentId}
            status={status}
            unit={unit}
            onPresetChange={(presetId) => {
              setChoice({ presetId, deploymentId: DEFAULT_DEPLOYMENT_ID });
            }}
            onDeploymentChange={(deploymentId) => {
              setChoice({ ...choice, deploymentId });
            }}
            onGenerate={() => {
              generateNew(randomSeed());
            }}
          />
          <SeedField
            seedCode={origin === undefined ? null : seedToCode(origin.seed)}
            edited={present?.edited ?? false}
            onLoadSeed={generateNew}
            onRandomSeed={() => {
              generateNew(randomSeed());
            }}
            onCopyLink={() => copyText(window.location.href)}
          />
          {notice !== null && (
            <p
              role="alert"
              className="rounded-lg border border-amber-400/50 bg-amber-950/50 p-3 text-sm text-amber-100"
            >
              {notice}
            </p>
          )}
        </div>
        <section aria-label="Board editor" className="min-w-0 space-y-3">
          <EditorToolbar
            canUndo={canUndo(editor)}
            canRedo={canRedo(editor)}
            selection={
              selectedPiece === undefined || shownSelected === undefined
                ? null
                : { name: selectedPiece.name, problems: problems.get(shownSelected.key) ?? [] }
            }
            snap={snap}
            movePairs={movePairs}
            showPhotos={showPhotos}
            onUndo={() => {
              dispatch({ type: 'undo' });
            }}
            onRedo={() => {
              dispatch({ type: 'redo' });
            }}
            onTurn={turn}
            onRemove={removeSelected}
            onSnapChange={setSnap}
            onMovePairsChange={setMovePairs}
            onShowPhotosChange={setShowPhotos}
          />
          <BoardView
            board={board}
            svgRef={svgRef}
            description={boardDescription(setup, shownPieces.length, unit)}
            dimmed={status.running}
            onBackgroundPointerDown={() => {
              dispatch({ type: 'selected', key: null });
            }}
            onPointerMove={drag.onPointerMove}
            onPointerUp={drag.onPointerUp}
            onPointerCancel={drag.cancel}
          >
            {setup !== undefined && <DeploymentZones deployment={setup.deployment} />}
            {showHidden && analysis.analysis !== null && (
              <HiddenAreaOverlay hidden={analysis.analysis.hidden} />
            )}
            {shownPieces.map((boardPiece) => {
              const piece = pieceById(COLLECTION, boardPiece.placement.pieceId);
              const issues = problems.get(boardPiece.key);
              return (
                <TerrainShape
                  key={boardPiece.key}
                  piece={piece}
                  placement={boardPiece.placement}
                  label={pieceLabel(piece, boardPiece.placement, unit, issues)}
                  selected={editor.selected === boardPiece.key}
                  hasProblems={issues !== undefined}
                  photoUrl={showPhotos ? images.photos.get(piece.id)?.url : undefined}
                  hitWidth={HIT_OUTLINE_PX * inchesPerPixel}
                  onPointerDown={(event) => {
                    drag.startMove(boardPiece.key, event);
                  }}
                  onFocus={() => {
                    dispatch({ type: 'selected', key: boardPiece.key });
                  }}
                />
              );
            })}
            {showLane && setup !== undefined && analysis.analysis?.lane != null && (
              <LaneOverlay
                lane={analysis.analysis.lane}
                limit={fairnessInput?.balance.maxClearLane ?? setup.preset.balance.maxClearLane}
                unit={unit}
              />
            )}
            {shownSelected !== undefined && selectedPiece !== undefined && (
              <RotateHandle
                center={shownSelected.placement.position}
                rotation={shownSelected.placement.rotation}
                reach={selectedPiece.footprint.depth / 2 + HANDLE_GAP_PX * inchesPerPixel}
                radius={HANDLE_RADIUS_PX * inchesPerPixel}
                onPointerDown={(event) => {
                  drag.startRotate(shownSelected.key, event);
                }}
              />
            )}
          </BoardView>
          {setup !== undefined && <TerrainLegend effects={setup.preset.terrainEffects} />}
          <details className="text-sm text-stone-300">
            <summary className="cursor-pointer text-stone-400">Keyboard shortcuts</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Tab and Shift+Tab move between pieces on the board.</li>
              <li>
                Arrow keys move the selected piece {formatLength(0.5, unit)}; with Shift,{' '}
                {formatLength(0.1, unit)}.
              </li>
              <li>Q and E turn it 15° left and right. Delete removes it. Escape lets go of it.</li>
              <li>Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes (Cmd on a Mac).</li>
            </ul>
          </details>
        </section>
        <div className="space-y-4">
          <FairnessPanel
            analysis={analysis.analysis}
            current={analysis.current}
            error={analysis.error}
            balance={fairnessInput?.balance ?? null}
            edited={present?.edited ?? false}
            misplaced={problems.size}
            warnings={warnings}
            unit={unit}
            showLane={showLane}
            showHidden={showHidden}
            onShowLaneChange={setShowLane}
            onShowHiddenChange={setShowHidden}
          />
          <PiecePalette
            collection={COLLECTION}
            pieces={pieces}
            photos={images.photos}
            unit={unit}
            canAdd={present !== null}
            photoBusy={photoEditor.busy === 'loading'}
            photoError={photoEditor.editing === null ? photoEditor.error : null}
            onAdd={addPiece}
            onPickPhoto={(piece, file) => {
              void photoEditor.open(piece, file);
            }}
            onRemovePhoto={(piece) => {
              images.removePhoto(piece.id);
            }}
          />
        </div>
      </main>
      {photoEditor.editing !== null && (
        <PhotoCropper
          piece={photoEditor.editing.piece}
          image={photoEditor.editing.image}
          saving={photoEditor.busy === 'saving'}
          error={photoEditor.error}
          onSave={(view) => {
            void photoEditor.save(view);
          }}
          onCancel={photoEditor.cancel}
        />
      )}
    </div>
  );
}

function initialChoice(link: ParsedBoardLink): BoardChoice {
  return link.kind === 'valid'
    ? { presetId: link.link.presetId, deploymentId: link.link.deploymentId }
    : { presetId: DEFAULT_PRESET.id, deploymentId: DEFAULT_DEPLOYMENT_ID };
}

function linkNotice(link: ParsedBoardLink): string | null {
  if (link.kind === 'invalid') {
    return `${link.reason} Here is a new board instead.`;
  }
  if (link.kind === 'valid' && link.versionMismatch) {
    return 'This link was made with a different version of the generator, so the board may not match the one that was shared.';
  }
  return null;
}

function placementRules(setup: GameSetup): PlacementRules {
  return {
    board: setup.board,
    deployment: setup.deployment,
    edgeMargin: setup.preset.edgeMargin,
    minGap: setup.preset.minGap,
  };
}

function withPreview(
  pieces: readonly BoardPiece[],
  preview: ReadonlyMap<string, PieceUpdate>,
): readonly BoardPiece[] {
  if (preview.size === 0) {
    return pieces;
  }
  return pieces.map((piece) => {
    const update = preview.get(piece.key);
    return update === undefined
      ? piece
      : {
          key: piece.key,
          placement: { ...piece.placement, position: update.position, rotation: update.rotation },
        };
  });
}

function boardDescription(
  setup: GameSetup | undefined,
  pieceCount: number,
  unit: Parameters<typeof formatLength>[1],
): string {
  if (setup === undefined) {
    return 'No board yet.';
  }
  const { preset, board, deployment } = setup;
  return `${preset.name}, ${formatLength(board.width, unit)} by ${formatLength(board.depth, unit)}, ${deployment.name} deployment, ${String(pieceCount)} terrain pieces. Tab to a piece to select it.`;
}
