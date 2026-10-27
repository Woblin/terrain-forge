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
import type { RuleId } from '../domain/fairness';
import { enabledRulesFor, startingPreset } from '../domain/gamePreferences';
import { resolveGameSetup, type GameSetup } from '../domain/gameSetup';
import { prepareCollection } from '../domain/generator';
import { add, type Point } from '../domain/geometry';
import { pieceById } from '../domain/layoutTerrain';
import { findMirrorTwin, withTwin } from '../domain/mirror';
import type { PlacementRules } from '../domain/placement';
import { sameTerrain } from '../domain/libraryLink';
import { findPreset } from '../domain/presets';
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
import {
  DEFAULT_DEPLOYMENT_ID,
  useBoardSession,
  type BoardChoice,
  type BoardSession,
  type CollectionSource,
} from '../hooks/boardSessionContext';
import { useGamePreferences } from '../hooks/gamePreferencesContext';
import { useTerrainLibrary } from '../hooks/libraryContext';
import { useUnits } from '../hooks/unitsContext';

const NO_PIECES: readonly BoardPiece[] = [];
const NO_WARNINGS: readonly string[] = [];
const NO_RULES: readonly RuleId[] = [];

/** Sizes that stay easy to hit with a finger whatever the board's scale, in CSS pixels. */
const HIT_OUTLINE_PX = 24;
const HANDLE_RADIUS_PX = 11;
const HANDLE_GAP_PX = 30;

const OWN: CollectionSource = { kind: 'own' };

/** How the page opens: on the board kept from before, or on a new one. */
type Entry =
  | { readonly kind: 'keep' }
  | {
      readonly kind: 'new';
      readonly link: ParsedBoardLink;
      /** Null for the game the player starts on, which is known once their settings load. */
      readonly choice: BoardChoice | null;
      readonly source: CollectionSource;
      /** The rules a shared link was made with; null for the player's own. */
      readonly enabledRules: readonly RuleId[] | null;
      /** True when the player picked this game on another page, so it becomes their default. */
      readonly picked: boolean;
    };

/** Generate a board, see how fair it is, and edit it by hand. */
export function BoardPage() {
  const { unit } = useUnits();
  const library = useTerrainLibrary();
  const settings = useGamePreferences();
  const session = useBoardSession();
  const { editor, dispatch, choice, setChoice, source, setSource, notice, setNotice, setView } =
    session;
  const { snap, movePairs, showPhotos, showLane, showHidden } = session.view;
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const ownCollection = library.pieces.length > 0 ? library.pieces : SAMPLE_COLLECTION;
  const [entry] = useState(() =>
    boardEntry(session, ownCollection, searchParams.toString(), location.state),
  );
  const { status, generate } = useGenerator();
  const svgRef = useRef<SVGSVGElement>(null);
  const boardPixels = useElementWidth(svgRef);

  const collection = source.kind === 'link' ? source.pieces : ownCollection;
  const knownIds = useMemo(() => new Set(collection.map((piece) => piece.id)), [collection]);

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
  const chosenPreset = findPreset(choice.presetId) ?? startingPreset(settings.preferences);
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
      origin === undefined || setup === undefined || prepared === undefined
        ? null
        : fairnessInputFor(
            setup,
            collection,
            shownPieces.map((piece) => piece.placement),
            prepared.balance,
            origin.enabledRules,
          ),
    [origin, setup, collection, prepared, shownPieces],
  );
  const analysis = useBoardAnalysis(fairnessInput);
  const problems = useMemo(
    () =>
      setup === undefined
        ? new Map<string, readonly string[]>()
        : checkBoard(shownPieces, collection, placementRules(setup), unit),
    [setup, shownPieces, collection, unit],
  );

  // Generation reads the player's terrain when it finishes, to see if it changed meanwhile.
  const latestOwn = useRef(ownCollection);
  useEffect(() => {
    latestOwn.current = ownCollection;
  }, [ownCollection]);

  /** The rules the player has on for a game. */
  function playerRules(next: BoardChoice): RuleId[] {
    const preset = findPreset(next.presetId);
    return preset === undefined ? [] : enabledRulesFor(preset, settings.preferences);
  }

  /** The game the player starts on, keeping the deployment picked before if it is that game. */
  function startingChoice(): BoardChoice {
    const presetId = startingPreset(settings.preferences).id;
    return {
      presetId,
      deploymentId: choice.presetId === presetId ? choice.deploymentId : DEFAULT_DEPLOYMENT_ID,
    };
  }

  async function runGeneration(
    next: BoardChoice,
    seed: number,
    from: CollectionSource,
    enabledRules: readonly RuleId[],
  ): Promise<void> {
    const target = resolveGameSetup(next.presetId, next.deploymentId);
    if (target === undefined) {
      return;
    }
    const pieces = from.kind === 'link' ? from.pieces : latestOwn.current;
    const result = await generate({
      board: target.board,
      pieces,
      preset: target.preset,
      deployment: target.deployment,
      seed,
      enabledRules,
    });
    if (from.kind === 'own' && latestOwn.current !== pieces) {
      // The library changed while the board was made; make it again from the terrain as it is.
      await runGeneration(next, seed, from, enabledRules);
      return;
    }
    if (result?.ok === true) {
      setSource(from);
      dispatch({ type: 'generated', layout: result.layout, newHistory: !sameSource(from, source) });
    }
  }

  /** A new board is always made from the player's own terrain, with their rules. */
  function generateNew(seed: number, next: BoardChoice = choice): void {
    setNotice(null);
    void runGeneration(next, seed, OWN, playerRules(next));
  }

  const libraryLoaded = library.status !== 'loading';
  // The library the page opened on. Another player's library, after a sign-in or sign-out, gets
  // a new board instead of the one the page was opened for.
  const entryOwner = useRef<string | null>(null);
  const startBoard = useEffectEvent(() => {
    entryOwner.current ??= library.owner;
    if (entryOwner.current === library.owner && entry.kind === 'new') {
      const from = linksToOwn(entry.source, ownCollection) ? OWN : entry.source;
      const next = entry.choice ?? startingChoice();
      dispatch({ type: 'cleared' });
      setChoice(next);
      if (entry.picked) {
        settings.choosePreset(next.presetId);
      }
      setSource(from);
      setNotice(linkNotice(entry.link));
      const seed = entry.link.kind === 'valid' ? entry.link.link.seed : randomSeed();
      void runGeneration(next, seed, from, entry.enabledRules ?? playerRules(next));
    } else if (editor.present === null) {
      const next = startingChoice();
      setChoice(next);
      generateNew(randomSeed(), next);
    }
  });
  // A board waits for the player's settings, so that it starts on their game and rules.
  const ready = libraryLoaded && settings.ready;
  useEffect(() => {
    if (ready) {
      startBoard();
    }
  }, [ready, library.owner]);

  /** Takes pieces that left the library off the board, or starts over on other terrain. */
  const followCollection = useEffectEvent((seen: readonly TerrainPiece[] | null) => {
    session.setSeenCollection(collection);
    if (seen === null || editor.present === null) {
      return;
    }
    if (
      source.kind === 'own' &&
      (seen === SAMPLE_COLLECTION) !== (collection === SAMPLE_COLLECTION)
    ) {
      generateNew(randomSeed());
      setNotice(
        collection === SAMPLE_COLLECTION
          ? 'Your library is empty, so this new board uses the sample set.'
          : 'This new board uses the terrain in your library instead of the sample set.',
      );
      return;
    }
    const missing = countMissingNow(editor, knownIds);
    if (missing > 0) {
      setNotice(removedNotice(missing));
    }
    dispatch({ type: 'collectionChanged', pieceIds: knownIds });
  });
  const { seenCollection } = session;
  useEffect(() => {
    if (seenCollection !== collection) {
      followCollection(seenCollection);
    }
  }, [seenCollection, collection]);

  useEffect(() => {
    if (origin === undefined) {
      return;
    }
    const search = boardLinkSearch({ ...origin, pieces: linkPieces(source, ownCollection) });
    if (searchParams.toString() !== search) {
      setSearchParams(search, { replace: true });
    }
  }, [origin, source, ownCollection, searchParams, setSearchParams]);

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
            enabledRules={enabledRulesFor(chosenPreset, settings.preferences)}
            settingsError={settings.error}
            onPresetChange={(presetId) => {
              setChoice({ presetId, deploymentId: DEFAULT_DEPLOYMENT_ID });
              settings.choosePreset(presetId);
            }}
            onRuleChange={(rule, enabled) => {
              settings.switchRule(chosenPreset, rule, enabled);
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
            onSnapChange={(value) => {
              setView({ snap: value });
            }}
            onMovePairsChange={(value) => {
              setView({ movePairs: value });
            }}
            onShowPhotosChange={(value) => {
              setView({ showPhotos: value });
            }}
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
            enabledRules={fairnessInput?.enabledRules ?? NO_RULES}
            edited={present?.edited ?? false}
            misplaced={problems.size}
            warnings={prepared?.warnings ?? NO_WARNINGS}
            unit={unit}
            showLane={showLane}
            showHidden={showHidden}
            onShowLaneChange={(value) => {
              setView({ showLane: value });
            }}
            onShowHiddenChange={(value) => {
              setView({ showHidden: value });
            }}
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

/**
 * The page keeps the board from before, unless a different shared link is opened, a page asked
 * for a new board, or there is no board yet.
 */
function boardEntry(
  session: BoardSession,
  own: readonly TerrainPiece[],
  search: string,
  routeState: unknown,
): Entry {
  const { present } = session.editor;
  const asked = requestedBoard(routeState);
  const keptSearch =
    present === null
      ? null
      : boardLinkSearch({ ...present.origin, pieces: linkPieces(session.source, own) });
  if (present !== null && asked === null && (search === '' || search === keptSearch)) {
    return { kind: 'keep' };
  }
  const link = parseBoardLink(search);
  if (link.kind === 'valid') {
    const { presetId, deploymentId, pieces, enabledRules } = link.link;
    return {
      kind: 'new',
      link,
      choice: { presetId, deploymentId },
      source: { kind: 'link', pieces: pieces ?? SAMPLE_COLLECTION },
      enabledRules: enabledRules ?? findPreset(presetId)?.defaultRules ?? null,
      picked: false,
    };
  }
  const presetId = asked?.presetId;
  return {
    kind: 'new',
    link,
    choice: presetId === undefined ? null : { presetId, deploymentId: DEFAULT_DEPLOYMENT_ID },
    source: OWN,
    enabledRules: null,
    picked: presetId !== undefined,
  };
}

/** Another page can ask for a new board, for a game system or for the one picked before. */
function requestedBoard(routeState: unknown): { presetId?: string } | null {
  if (typeof routeState !== 'object' || routeState === null) {
    return null;
  }
  if ('presetId' in routeState) {
    const { presetId } = routeState;
    return typeof presetId === 'string' && findPreset(presetId) !== undefined ? { presetId } : {};
  }
  return 'newBoard' in routeState && routeState.newBoard === true ? {} : null;
}

/** The pieces a board's link carries; none stands for the sample set. */
function linkPieces(
  source: CollectionSource,
  own: readonly TerrainPiece[],
): readonly TerrainPiece[] | null {
  const pieces = source.kind === 'link' ? source.pieces : own;
  return pieces === SAMPLE_COLLECTION ? null : pieces;
}

/** Two sources give the same terrain: both the player's own, or the very same link. */
function sameSource(a: CollectionSource, b: CollectionSource): boolean {
  return a === b || (a.kind === 'own' && b.kind === 'own');
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
