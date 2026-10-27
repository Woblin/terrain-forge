import { SparklesIcon, XIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { boardCentre } from '../domain/board';
import { drawsUpright, fitBoard, inchesPerPixel, screenMoveToBoard } from '../domain/boardFit';
import { fairnessInputFor } from '../domain/boardAnalysis';
import { checkBoard } from '../domain/boardChecks';
import {
  canRedo,
  canUndo,
  countMissingNow,
  currentLayout,
  type BoardPiece,
  type PieceUpdate,
} from '../domain/editor';
import { evaluateFairness, RULE_IDS, type RuleId } from '../domain/fairness';
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
import {
  changedPieces,
  defaultBoardName,
  hasUnsavedChanges,
  layoutFingerprint,
  libraryHasTerrain,
  photoFits,
  placedTerrain,
  savedBoardContent,
  type SavedBoard,
} from '../domain/savedBoard';
import { boardLinkSearch, parseBoardLink, type ParsedBoardLink } from '../domain/shareLink';
import { normalizeRotation, snapRotation } from '../domain/snapping';
import type { Placement, TerrainPiece } from '../domain/terrain';
import { formatLength, type LengthUnit } from '../domain/units';
import { BoardToolbar } from '../components/BoardToolbar';
import { BoardView } from '../components/BoardView';
import { BoardWorkspace } from '../components/BoardWorkspace';
import { BUTTON_STYLES } from '../components/buttonStyles';
import { DeploymentZones } from '../components/DeploymentZones';
import { EditorStatus } from '../components/EditorStatus';
import { FairnessPanel } from '../components/FairnessPanel';
import { FairnessVerdict } from '../components/FairnessVerdict';
import { GeneratorControls } from '../components/GeneratorControls';
import { HiddenAreaOverlay } from '../components/HiddenAreaOverlay';
import { IconButton } from '../components/IconButton';
import { LaneOverlay } from '../components/LaneOverlay';
import { PiecePalette } from '../components/PiecePalette';
import { PhoneBoardButtons } from '../components/PhoneBoardButtons';
import { pieceLabel } from '../components/pieceLabel';
import { RotateHandle } from '../components/RotateHandle';
import { SaveBoardControls } from '../components/SaveBoardControls';
import { SeedField } from '../components/SeedField';
import { SelectionBar } from '../components/SelectionBar';
import { TerrainLegend } from '../components/TerrainLegend';
import { TerrainChoiceDialog } from '../components/TerrainChoiceDialog';
import { TerrainShape } from '../components/TerrainShape';
import { copyText } from '../services/clipboard';
import { useBoardAnalysis } from '../hooks/useBoardAnalysis';
import { useBoardDrag } from '../hooks/useBoardDrag';
import { useBoardLayout } from '../hooks/useBoardLayout';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { useEditorKeys } from '../hooks/useEditorKeys';
import { useElementSize } from '../hooks/useElementSize';
import { randomSeed, useGenerator } from '../hooks/useGenerator';
import { useLeaveWarning } from '../hooks/useLeaveWarning';
import {
  DEFAULT_DEPLOYMENT_ID,
  useBoardSession,
  type BoardChoice,
  type BoardSession,
  type CollectionSource,
} from '../hooks/boardSessionContext';
import { useGamePreferences } from '../hooks/gamePreferencesContext';
import { useTerrainLibrary } from '../hooks/libraryContext';
import { useSavedBoards, type SavedBoards } from '../hooks/savedBoardsContext';
import { useUnits } from '../hooks/unitsContext';

const NO_PIECES: readonly BoardPiece[] = [];
const NO_WARNINGS: readonly string[] = [];
const NO_RULES: readonly RuleId[] = [];

/** Sizes in CSS pixels that stay easy to hit whatever the board's scale. */
interface TargetSizes {
  readonly hitOutline: number;
  readonly handleRadius: number;
  readonly handleGap: number;
}

const MOUSE_TARGETS: TargetSizes = { hitOutline: 24, handleRadius: 11, handleGap: 30 };
/** Fingers need bigger targets: the handle is 44 pixels across, the size of a tap. */
const TOUCH_TARGETS: TargetSizes = { hitOutline: 40, handleRadius: 22, handleGap: 38 };

/** Inches per pixel before the board has been measured. */
const UNMEASURED_PIXEL_SIZE = 0.1;

const OWN: CollectionSource = { kind: 'own' };

/** The address parameter that names a saved board, as in `/board?saved=<id>`. */
const SAVED_PARAM = 'saved';

/** A new board the player asked for, waiting for them to pick its terrain. */
interface PendingBoard {
  readonly seed: number;
  readonly choice: BoardChoice;
}

/** How the page opens: on the board kept from before, or on a new one. */
type Entry =
  | { readonly kind: 'keep' }
  | { readonly kind: 'saved'; readonly id: string }
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
  const savedBoards = useSavedBoards();
  const settings = useGamePreferences();
  const session = useBoardSession();
  const {
    editor,
    dispatch,
    choice,
    setChoice,
    source,
    setSource,
    notice,
    setNotice,
    setView,
    opened,
    setOpened,
  } = session;
  const { snap, movePairs, showPhotos, showLane, showHidden } = session.view;
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const ownCollection = library.pieces.length > 0 ? library.pieces : SAMPLE_COLLECTION;
  const [entry] = useState(() =>
    boardEntry(session, ownCollection, searchParams.toString(), location.state),
  );
  const [pendingBoard, setPendingBoard] = useState<PendingBoard | null>(null);
  const { status, generate } = useGenerator();
  const layout = useBoardLayout();
  const targets = useCoarsePointer() ? TOUCH_TARGETS : MOUSE_TARGETS;
  const frameRef = useRef<SVGGElement>(null);
  const [boardArea, boardAreaRef, boardSpace] = useElementSize<HTMLDivElement>();

  const collection = source.kind === 'own' ? ownCollection : source.pieces;
  const knownIds = useMemo(() => new Set(collection.map((piece) => piece.id)), [collection]);
  // Terrain that is not the library's shows a library photo only where it fits the piece.
  const photos = useMemo(
    () =>
      source.kind === 'own'
        ? library.photos
        : new Map(
            [...library.photos].filter(([id]) => {
              const piece = pieceOf(collection, id);
              return (
                piece !== undefined &&
                photoFits(
                  piece,
                  library.pieces.find((candidate) => candidate.id === id),
                )
              );
            }),
          ),
    [source.kind, library.photos, library.pieces, collection],
  );

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
  const upright = drawsUpright(board, boardSpace);
  const drawnSize = fitBoard(board, boardSpace, upright);
  const pixelSize = inchesPerPixel(board, drawnSize, upright) ?? UNMEASURED_PIXEL_SIZE;

  const drag = useBoardDrag(
    frameRef,
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
  const unsaved = hasUnsavedChanges(opened, present);
  // The name the account has for the board, which also shows a refused rename undone.
  const shownOpened =
    opened === null
      ? null
      : {
          ...opened,
          name: savedBoards.boards.find((board) => board.id === opened.id)?.name ?? opened.name,
        };
  useLeaveWarning(unsaved);
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
    const pieces = from.kind === 'own' ? latestOwn.current : from.pieces;
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

  /** A new board is made from the player's own terrain, with their rules. */
  function generateNew(seed: number, next: BoardChoice = choice): void {
    setNotice(null);
    setOpened(null);
    void runGeneration(next, seed, OWN, playerRules(next));
  }

  /** A new board from the terrain kept with this board, with the player's rules. */
  function generateFromBoardTerrain(seed: number, next: BoardChoice): void {
    setNotice(null);
    setOpened(null);
    void runGeneration(next, seed, source, playerRules(next));
  }

  /** A new board the player asked for. Terrain kept with the board asks which terrain to use. */
  function requestNew(seed: number, next: BoardChoice = choice): void {
    if (source.kind === 'saved') {
      setPendingBoard({ seed, choice: next });
    } else {
      generateNew(seed, next);
    }
  }

  /** Shows a saved board as it was saved, on the library's terrain when it is still the same. */
  function openSaved(board: SavedBoard): void {
    const { layout } = board;
    const changed = changedPieces(
      placedTerrain(board.pieces, layout.placements),
      ownCollection,
    ).length;
    dispatch({ type: 'loaded', layout, edited: board.edited });
    setChoice({ presetId: layout.presetId, deploymentId: layout.deploymentId });
    setSource(changed === 0 ? OWN : { kind: 'saved', pieces: board.pieces });
    setNotice(changed === 0 ? null : terrainChangedNotice(changed));
    setOpened({ id: board.id, name: board.name, fingerprint: layoutFingerprint(layout) });
  }

  /** Opens the saved board the address names, or a new board when it cannot be found. */
  function openEntry(boardId: string): void {
    const board = savedBoards.boards.find((saved) => saved.id === boardId);
    if (board !== undefined) {
      openSaved(board);
      return;
    }
    const next = startingChoice();
    setChoice(next);
    generateNew(randomSeed(), next);
    setNotice(missingBoardNotice(savedBoards));
  }

  /** Saves the board under `name`; returns a message when it did not work. */
  function saveBoard(name: string, asCopy: boolean): string | null {
    if (present === null) {
      return 'There is no board to save yet.';
    }
    // Measured now: the analysis on screen can be of the board before the last change.
    const passed =
      fairnessInput !== null && evaluateFairness(fairnessInput).failedRules.length === 0;
    const content = savedBoardContent(present, collection, name, passed);
    const result = savedBoards.save(content, asCopy ? null : (shownOpened?.id ?? null));
    if (!result.ok) {
      return result.message;
    }
    setOpened({
      id: result.id,
      name: content.name,
      fingerprint: layoutFingerprint(content.layout),
    });
    return null;
  }

  function renameBoard(name: string): void {
    if (opened !== null) {
      savedBoards.rename(opened.id, name);
    }
  }

  const libraryLoaded = library.status !== 'loading';
  // The library the page opened on. Another player's library, after a sign-in or sign-out, gets
  // a new board instead of the one the page was opened for.
  const entryOwner = useRef<string | null>(null);
  const startBoard = useEffectEvent(() => {
    entryOwner.current ??= library.owner;
    if (entryOwner.current === library.owner && entry.kind === 'saved') {
      openEntry(entry.id);
    } else if (entryOwner.current === library.owner && entry.kind === 'new') {
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
  const ready =
    libraryLoaded && settings.ready && (entry.kind !== 'saved' || savedBoards.status !== 'loading');
  useEffect(() => {
    if (ready) {
      startBoard();
    }
  }, [ready, library.owner]);

  // A page that opens another board has nothing to follow for the board it replaces.
  const replacedSeen = useRef(entry.kind === 'keep' ? null : session.seenCollection);

  /** Takes pieces that left the library off the board, or starts over on other terrain. */
  const followCollection = useEffectEvent((seen: readonly TerrainPiece[] | null) => {
    session.setSeenCollection(collection);
    if (seen === null || editor.present === null || seen === replacedSeen.current) {
      return;
    }
    const used = placedTerrain(seen, currentLayout(editor.present).placements);
    if (opened !== null && source.kind === 'own' && !libraryHasTerrain(used, collection)) {
      // A saved board keeps the terrain it was saved with.
      setSource({ kind: 'saved', pieces: seen });
      setNotice(terrainChangedNotice(changedPieces(used, collection).length));
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
  // Once the page's board is in place, every later change of terrain is followed.
  useEffect(() => {
    if (ready) {
      replacedSeen.current = null;
    }
  }, [ready]);

  /** Terrain kept with the board that the library holds unchanged becomes the library's again. */
  const adoptLibrary = useEffectEvent(() => {
    if (
      source.kind === 'saved' &&
      editor.present !== null &&
      libraryHasTerrain(
        placedTerrain(source.pieces, currentLayout(editor.present).placements),
        ownCollection,
      )
    ) {
      setSource(OWN);
    }
  });
  useEffect(() => {
    if (libraryLoaded) {
      adoptLibrary();
    }
  }, [libraryLoaded, source, ownCollection]);

  useEffect(() => {
    if (origin === undefined) {
      return;
    }
    const search =
      opened === null
        ? boardLinkSearch({ ...origin, pieces: linkPieces(source, ownCollection) })
        : new URLSearchParams([[SAVED_PARAM, opened.id]]).toString();
    if (searchParams.toString() !== search) {
      setSearchParams(search, { replace: true });
    }
  }, [origin, source, ownCollection, opened, searchParams, setSearchParams]);

  /** The share link of the board, which makes the same board again, without hand edits. */
  function shareUrl(): string {
    if (origin === undefined) {
      return window.location.href;
    }
    const search = boardLinkSearch({ ...origin, pieces: linkPieces(source, ownCollection) });
    return new URL(`/board?${search}`, window.location.origin).href;
  }

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

  function undo(): void {
    dispatch({ type: 'undo' });
  }

  function redo(): void {
    dispatch({ type: 'redo' });
  }

  useEditorKeys(boardArea, {
    hasSelection: selected !== undefined,
    undo,
    redo,
    nudge: (move) => {
      nudge(screenMoveToBoard(move, upright));
    },
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
  const selection =
    selectedPiece === undefined || shownSelected === undefined
      ? null
      : { name: selectedPiece.name, problems: problems.get(shownSelected.key) ?? NO_WARNINGS };
  const report = analysis.analysis?.report ?? null;

  const setupPanel = (
    <div className="space-y-6">
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
          requestNew(randomSeed());
        }}
      />
      <SeedField
        seedCode={origin === undefined ? null : seedToCode(origin.seed)}
        edited={present?.edited ?? false}
        onLoadSeed={(seed) => {
          requestNew(seed);
        }}
        onRandomSeed={() => {
          requestNew(randomSeed());
        }}
        onCopyLink={() => copyText(shareUrl())}
      />
      <SaveBoardControls
        access={savedBoards.access}
        opened={shownOpened}
        unsaved={unsaved}
        sending={savedBoards.saving}
        hasBoard={present !== null && savedBoards.status === 'ready'}
        defaultName={defaultBoardName(
          setup?.preset.name ?? chosenPreset.name,
          setup?.deployment.name ?? '',
          new Date(),
        )}
        error={savedBoards.writeError}
        onSave={saveBoard}
        onRename={renameBoard}
      />
    </div>
  );

  const fairnessPanel = (
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
  );

  const piecesPanel = (
    <PiecePalette
      collection={collection}
      source={sourceKind(source, collection)}
      pieces={pieces}
      photos={photos}
      unit={unit}
      canAdd={present !== null}
      onAdd={addPiece}
    />
  );

  const boardDrawing = (
    <BoardView
      board={board}
      frameRef={frameRef}
      upright={upright}
      size={drawnSize}
      description={boardDescription(setup, shownPieces.length, unit)}
      dimmed={status.running}
      onBackgroundPointerDown={() => {
        dispatch({ type: 'selected', key: null });
      }}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.cancel}
    >
      {setup !== undefined && <DeploymentZones deployment={setup.deployment} upright={upright} />}
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
            photoUrl={showPhotos ? photos.get(piece.id)?.url : undefined}
            hitWidth={targets.hitOutline * pixelSize}
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
          upright={upright}
        />
      )}
      {shownSelected !== undefined && selectedPiece !== undefined && (
        <RotateHandle
          center={shownSelected.placement.position}
          rotation={shownSelected.placement.rotation}
          reach={selectedPiece.footprint.depth / 2 + targets.handleGap * pixelSize}
          radius={targets.handleRadius * pixelSize}
          onPointerDown={(event) => {
            drag.startRotate(shownSelected.key, event);
          }}
        />
      )}
    </BoardView>
  );

  return (
    <>
      <BoardWorkspace
        layout={layout}
        notice={
          notice === null ? null : (
            <div
              role="alert"
              className="border-warn-line bg-warn-soft text-warn-ink shadow-shade flex items-start gap-2 rounded-xl border py-1 pr-1 pl-3 text-sm shadow-lg"
            >
              <p className="flex-1 py-1.5">{notice}</p>
              <IconButton
                icon={XIcon}
                label="Dismiss"
                onClick={() => {
                  setNotice(null);
                }}
              />
            </div>
          )
        }
        setup={setupPanel}
        fairness={fairnessPanel}
        pieces={piecesPanel}
        toolbar={
          <BoardToolbar
            canUndo={canUndo(editor)}
            canRedo={canRedo(editor)}
            hasSelection={selection !== null}
            snap={snap}
            movePairs={movePairs}
            showPhotos={showPhotos}
            onUndo={undo}
            onRedo={redo}
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
        }
        boardAreaRef={boardAreaRef}
        board={boardDrawing}
        footer={
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
              <EditorStatus selection={selection} />
              {setup !== undefined && <TerrainLegend effects={setup.preset.terrainEffects} />}
            </div>
            <details className="text-soft text-sm pointer-coarse:hidden">
              <summary className="text-muted cursor-pointer">Keyboard shortcuts</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Tab and Shift+Tab move between pieces on the board.</li>
                <li>
                  Arrow keys move the selected piece {formatLength(0.5, unit)}; with Shift,{' '}
                  {formatLength(0.1, unit)}.
                </li>
                <li>
                  Q and E turn it 15° left and right. Delete removes it. Escape lets go of it.
                </li>
                <li>Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes (Cmd on a Mac).</li>
              </ul>
            </details>
          </div>
        }
        phoneButtons={
          <PhoneBoardButtons
            canUndo={canUndo(editor)}
            canRedo={canRedo(editor)}
            layers={session.view}
            onUndo={undo}
            onRedo={redo}
            onLayersChange={setView}
          />
        }
        selectionBar={
          selection === null ||
          shownSelected === undefined ||
          selectedPiece === undefined ? null : (
            <SelectionBar
              name={selection.name}
              detail={pieceDetail(selectedPiece, shownSelected.placement, unit)}
              problems={selection.problems}
              onTurn={turn}
              onRemove={removeSelected}
              onDone={() => {
                dispatch({ type: 'selected', key: null });
              }}
            />
          )
        }
        summary={
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 text-sm">
              {report === null ? (
                <p className="text-muted">Generate a board to see how fair it is.</p>
              ) : (
                <FairnessVerdict
                  report={report}
                  edited={present?.edited ?? false}
                  allRulesOn={(fairnessInput?.enabledRules.length ?? 0) === RULE_IDS.length}
                  compact
                />
              )}
            </div>
            <button
              type="button"
              disabled={status.running}
              onClick={() => {
                requestNew(randomSeed());
              }}
              className={`${BUTTON_STYLES.primary} shrink-0`}
            >
              <SparklesIcon className="size-4" aria-hidden="true" />
              Generate
            </button>
          </div>
        }
      />
      {pendingBoard !== null && (
        <TerrainChoiceDialog
          onBoardTerrain={() => {
            setPendingBoard(null);
            generateFromBoardTerrain(pendingBoard.seed, pendingBoard.choice);
          }}
          onLibrary={() => {
            setPendingBoard(null);
            generateNew(pendingBoard.seed, pendingBoard.choice);
          }}
          onCancel={() => {
            setPendingBoard(null);
          }}
        />
      )}
    </>
  );
}

/** The selected piece's size and turn, in one short line. */
function pieceDetail(piece: TerrainPiece, placement: Placement, unit: LengthUnit): string {
  const { width, depth } = piece.footprint;
  return `${formatLength(width, unit)} × ${formatLength(depth, unit)}, turned ${String(Math.round(placement.rotation))}°`;
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
  const savedId = new URLSearchParams(search).get(SAVED_PARAM);
  if (savedId !== null && asked === null) {
    return present !== null && session.opened?.id === savedId
      ? { kind: 'keep' }
      : { kind: 'saved', id: savedId };
  }
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
  const pieces = source.kind === 'own' ? own : source.pieces;
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
): 'link' | 'saved' | 'sample' | 'library' {
  if (source.kind !== 'own') {
    return source.kind;
  }
  return collection === SAMPLE_COLLECTION ? 'sample' : 'library';
}

function removedNotice(count: number): string {
  return count === 1
    ? 'A piece was taken off the board because it is no longer in your library.'
    : `${String(count)} pieces were taken off the board because they are no longer in your library.`;
}

function terrainChangedNotice(count: number): string {
  return count === 1
    ? 'This board shows its terrain as it was saved: one of its pieces has changed or left your library since.'
    : `This board shows its terrain as it was saved: ${String(count)} of its pieces have changed or left your library since.`;
}

function missingBoardNotice(savedBoards: SavedBoards): string {
  const instead = 'Here is a new board instead.';
  if (savedBoards.access === 'signedOut') {
    return `Sign in to open your saved boards. ${instead}`;
  }
  if (savedBoards.access === 'unverified') {
    return `Verify your email to open your saved boards. ${instead}`;
  }
  if (savedBoards.loadError !== null) {
    return `${savedBoards.loadError} ${instead}`;
  }
  return `This saved board was not found. It may have been deleted. ${instead}`;
}

/** The piece with this id in the collection, if there is one. */
function pieceOf(collection: readonly TerrainPiece[], id: string): TerrainPiece | undefined {
  return collection.find((piece) => piece.id === id);
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
