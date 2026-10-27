import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { boardCentre } from '../domain/board';
import { fairnessInputFor } from '../domain/boardAnalysis';
import { checkBoard } from '../domain/boardChecks';
import {
  canRedo,
  canUndo,
  countMissingNow,
  type BoardPiece,
  type PieceUpdate,
} from '../domain/editor';
import { resolveGameSetup, type GameSetup } from '../domain/gameSetup';
import { prepareCollection } from '../domain/generator';
import { add, type Point } from '../domain/geometry';
import { pieceById } from '../domain/layoutTerrain';
import { findMirrorTwin, withTwin } from '../domain/mirror';
import type { PlacementRules } from '../domain/placement';
import { sameTerrain } from '../domain/libraryLink';
import { findPreset, PRESETS, type GameSystemPreset } from '../domain/presets';
import { seedToCode } from '../domain/random';
import { SAMPLE_COLLECTION } from '../domain/sampleCollection';
import { boardLinkSearch, parseBoardLink, type ParsedBoardLink } from '../domain/shareLink';
import { normalizeRotation, snapRotation } from '../domain/snapping';
import type { Placement, TerrainPiece } from '../domain/terrain';
import { formatLength } from '../domain/units';
import { AppHeader } from '../components/AppHeader';
import { BoardView } from '../components/BoardView';
import { DeploymentZones } from '../components/DeploymentZones';
import { EditorToolbar } from '../components/EditorToolbar';
import { FairnessPanel } from '../components/FairnessPanel';
import { GeneratorControls } from '../components/GeneratorControls';
import { HiddenAreaOverlay } from '../components/HiddenAreaOverlay';
import { LaneOverlay } from '../components/LaneOverlay';
import { PiecePalette } from '../components/PiecePalette';
import { pieceLabel } from '../components/pieceLabel';
import { RotateHandle } from '../components/RotateHandle';
import { SeedField } from '../components/SeedField';
import { TerrainLegend } from '../components/TerrainLegend';
import { TerrainShape } from '../components/TerrainShape';
import { copyText } from '../services/clipboard';
import { useBoardAnalysis } from '../hooks/useBoardAnalysis';
import { useBoardDrag } from '../hooks/useBoardDrag';
import { useEditorKeys } from '../hooks/useEditorKeys';
import { useElementWidth } from '../hooks/useElementWidth';
import { randomSeed, useGenerator } from '../hooks/useGenerator';
import { useLayoutEditor } from '../hooks/useLayoutEditor';
import { useTerrainLibrary } from '../hooks/libraryContext';
import { useUnits } from '../hooks/unitsContext';

const DEFAULT_PRESET = PRESETS[0] as GameSystemPreset;
const DEFAULT_DEPLOYMENT_ID = 'long-edges';
const NO_PIECES: readonly BoardPiece[] = [];
const NO_WARNINGS: readonly string[] = [];

/** Sizes that stay easy to hit with a finger whatever the board's scale, in CSS pixels. */
const HIT_OUTLINE_PX = 24;
const HANDLE_RADIUS_PX = 11;
const HANDLE_GAP_PX = 30;

interface BoardChoice {
  readonly presetId: string;
  readonly deploymentId: string;
}

/** Where the board's pieces come from: the player's own terrain, or a shared link. */
type CollectionSource =
  { readonly kind: 'own' } | { readonly kind: 'link'; readonly pieces: readonly TerrainPiece[] };

const OWN: CollectionSource = { kind: 'own' };

/** Generate a board, see how fair it is, and edit it by hand. */
export function BoardPage() {
  const { unit } = useUnits();
  const library = useTerrainLibrary();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialLink] = useState(() => parseBoardLink(searchParams.toString()));
  const [choice, setChoice] = useState(() => initialChoice(initialLink, location.state));
  const [notice, setNotice] = useState(() => linkNotice(initialLink));
  const [source, setSource] = useState(() => initialSource(initialLink));
  const [editor, dispatch] = useLayoutEditor();
  const { status, generate } = useGenerator();
  const [snap, setSnap] = useState(true);
  const [movePairs, setMovePairs] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showLane, setShowLane] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const boardPixels = useElementWidth(svgRef);

  const ownCollection = library.pieces.length > 0 ? library.pieces : SAMPLE_COLLECTION;
  const collection = source.kind === 'link' ? source.pieces : ownCollection;
  const knownIds = useMemo(() => new Set(collection.map((piece) => piece.id)), [collection]);
  const [seenCollection, setSeenCollection] = useState(collection);
  if (seenCollection !== collection) {
    setSeenCollection(collection);
    const missing = countMissingNow(editor, knownIds);
    if (missing > 0) {
      setNotice(removedNotice(missing));
    }
    dispatch({ type: 'collectionChanged', pieceIds: knownIds });
  }

  const { present } = editor;
  const origin = present?.origin;
  // Pieces that just left the library are already gone from this render, before the editor
  // drops them from its history.
  const pieces = useMemo(
    () => (present?.pieces ?? NO_PIECES).filter((piece) => knownIds.has(piece.placement.pieceId)),
    [present, knownIds],
  );
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
      collection,
      edgeMargin: setup?.preset.edgeMargin ?? 0,
      unit,
      snap,
      movePairs,
    },
    dispatch,
  );
  const shownPieces = useMemo(() => withPreview(pieces, drag.preview), [pieces, drag.preview]);
  const prepared = useMemo(
    () =>
      setup === undefined ? undefined : prepareCollection(collection, setup.board, setup.preset),
    [setup, collection],
  );
  const fairnessInput = useMemo(
    () =>
      setup === undefined || prepared === undefined
        ? null
        : fairnessInputFor(
            setup,
            collection,
            shownPieces.map((piece) => piece.placement),
            prepared.balance,
          ),
    [setup, collection, prepared, shownPieces],
  );
  const analysis = useBoardAnalysis(fairnessInput);
  const problems = useMemo(
    () =>
      setup === undefined
        ? new Map<string, readonly string[]>()
        : checkBoard(shownPieces, collection, placementRules(setup), unit),
    [setup, shownPieces, collection, unit],
  );

  async function runGeneration(
    next: BoardChoice,
    seed: number,
    from: CollectionSource,
  ): Promise<void> {
    const target = resolveGameSetup(next.presetId, next.deploymentId);
    if (target === undefined) {
      return;
    }
    const result = await generate({
      board: target.board,
      pieces: from.kind === 'link' ? from.pieces : ownCollection,
      preset: target.preset,
      deployment: target.deployment,
      seed,
    });
    if (result?.ok === true) {
      setSource(from);
      dispatch({ type: 'generated', layout: result.layout, newHistory: from !== source });
    }
  }

  /** A new board is always made from the player's own terrain. */
  function generateNew(seed: number): void {
    setNotice(null);
    void runGeneration(choice, seed, OWN);
  }

  const libraryLoaded = library.status !== 'loading';
  const generateFirstBoard = useEffectEvent(() => {
    const seed = initialLink.kind === 'valid' ? initialLink.link.seed : randomSeed();
    void runGeneration(choice, seed, linksToOwn(source, ownCollection) ? OWN : source);
  });
  useEffect(() => {
    if (libraryLoaded) {
      // The board's state changes only once the worker replies, never during this effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      generateFirstBoard();
    }
  }, [libraryLoaded]);

  useEffect(() => {
    if (origin === undefined) {
      return;
    }
    const search = boardLinkSearch({
      ...origin,
      pieces: collection === SAMPLE_COLLECTION ? null : collection,
    });
    if (searchParams.toString() !== search) {
      setSearchParams(search, { replace: true });
    }
  }, [origin, collection, searchParams, setSearchParams]);

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
    hasSelection: selected !== undefined,
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
      : pieceById(collection, shownSelected.placement.pieceId);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <AppHeader />
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
              const piece = pieceById(collection, boardPiece.placement.pieceId);
              const issues = problems.get(boardPiece.key);
              return (
                <TerrainShape
                  key={boardPiece.key}
                  piece={piece}
                  placement={boardPiece.placement}
                  label={pieceLabel(piece, boardPiece.placement, unit, issues)}
                  selected={editor.selected === boardPiece.key}
                  hasProblems={issues !== undefined}
                  photoUrl={showPhotos ? library.photos.get(piece.id)?.url : undefined}
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
            warnings={prepared?.warnings ?? NO_WARNINGS}
            unit={unit}
            showLane={showLane}
            showHidden={showHidden}
            onShowLaneChange={setShowLane}
            onShowHiddenChange={setShowHidden}
          />
          <PiecePalette
            collection={collection}
            source={sourceKind(source, collection)}
            pieces={pieces}
            photos={library.photos}
            unit={unit}
            canAdd={present !== null}
            onAdd={addPiece}
          />
        </div>
      </main>
    </div>
  );
}

/** A shared link decides the board; otherwise the library page may ask for a game system. */
function initialChoice(link: ParsedBoardLink, routeState: unknown): BoardChoice {
  if (link.kind === 'valid') {
    return { presetId: link.link.presetId, deploymentId: link.link.deploymentId };
  }
  const asked = requestedPreset(routeState);
  return { presetId: asked ?? DEFAULT_PRESET.id, deploymentId: DEFAULT_DEPLOYMENT_ID };
}

function requestedPreset(routeState: unknown): string | null {
  if (typeof routeState !== 'object' || routeState === null || !('presetId' in routeState)) {
    return null;
  }
  const { presetId } = routeState;
  return typeof presetId === 'string' && findPreset(presetId) !== undefined ? presetId : null;
}

/** A link reproduces its board from the terrain it carries, or the sample set if none. */
function initialSource(link: ParsedBoardLink): CollectionSource {
  return link.kind === 'valid'
    ? { kind: 'link', pieces: link.link.pieces ?? SAMPLE_COLLECTION }
    : OWN;
}

/** A link to the player's own terrain, such as their own board reopened, shows their pieces. */
function linksToOwn(source: CollectionSource, own: readonly TerrainPiece[]): boolean {
  return source.kind === 'link' && sameTerrain(source.pieces, own);
}

function sourceKind(
  source: CollectionSource,
  collection: readonly TerrainPiece[],
): 'link' | 'sample' | 'library' {
  if (source.kind === 'link') {
    return 'link';
  }
  return collection === SAMPLE_COLLECTION ? 'sample' : 'library';
}

function removedNotice(count: number): string {
  return count === 1
    ? 'A piece was taken off the board because it is no longer in your library.'
    : `${String(count)} pieces were taken off the board because they are no longer in your library.`;
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
