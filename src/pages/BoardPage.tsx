import { SparklesIcon, XIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { boardCentre } from '../domain/board';
import { drawsUpright, fitBoard, inchesPerPixel, screenMoveToBoard } from '../domain/boardFit';
import { fairnessInputFor } from '../domain/boardAnalysis';
import { checkBoard } from '../domain/boardChecks';
import { boardEntry, SAVED_PARAM } from '../domain/boardEntry';
import {
  boardLinkFor,
  DEFAULT_DEPLOYMENT_ID,
  linksToOwn,
  OWN_SOURCE,
  sameSource,
  sourceKind,
  type BoardChoice,
  type CollectionSource,
} from '../domain/boardSource';
import { piecesToMeasure } from '../domain/edgeDistance';
import {
  canRedo,
  canUndo,
  countMissingNow,
  currentLayout,
  withPreview,
  type BoardPiece,
  type PieceUpdate,
} from '../domain/editor';
import { evaluateFairness, type RuleId } from '../domain/fairness';
import { enabledRulesFor, startingPreset, usesDefaultRules } from '../domain/gamePreferences';
import { placementRulesFor, resolveGameSetup } from '../domain/gameSetup';
import { prepareCollection } from '../domain/generator';
import { findById } from '../domain/findById';
import { add, type Point } from '../domain/geometry';
import { findMat, type MatId } from '../domain/mats';
import { findMirrorTwin, withTwin } from '../domain/mirror';
import { placingOrder, stepPiece } from '../domain/placingOrder';
import { findPreset, showsLaneByDefault } from '../domain/presets';
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
import { normalizeRotation, snapRotation } from '../domain/snapping';
import type { Placement, TerrainPiece } from '../domain/terrain';
import { BoardFooter } from '../components/BoardFooter';
import { BoardHeaderBar, type BoardSaveState } from '../components/BoardHeaderBar';
import { BoardOptionsButton } from '../components/BoardOptionsButton';
import { BoardToolbar } from '../components/BoardToolbar';
import { BoardView } from '../components/BoardView';
import { BoardWorkspace } from '../components/BoardWorkspace';
import { BUTTON_STYLES } from '../components/buttonStyles';
import { DeploymentZones } from '../components/DeploymentZones';
import {
  boardDescription,
  collectionSwitchedNotice,
  linkNotice,
  missingBoardNotice,
  removedNotice,
  terrainChangedNotice,
} from '../components/boardNotices';
import { EdgeDistanceOverlay } from '../components/EdgeDistanceOverlay';
import { FairnessAnnouncer } from '../components/FairnessAnnouncer';
import { FairBadge } from '../components/FairBadge';
import { FairnessPanel } from '../components/FairnessPanel';
import { GeneratorControls } from '../components/GeneratorControls';
import { HiddenAreaOverlay } from '../components/HiddenAreaOverlay';
import { IconButton } from '../components/IconButton';
import { LaneOverlay } from '../components/LaneOverlay';
import { MatAccordion } from '../components/MatAccordion';
import { MeasureStepper } from '../components/MeasureStepper';
import { measureDetail } from '../components/measureText';
import { PiecePalette } from '../components/PiecePalette';
import { PhoneBoardButtons } from '../components/PhoneBoardButtons';
import { SheetVerdictButton } from '../components/SheetVerdictButton';
import { pieceLabel } from '../components/pieceLabel';
import { RotateHandle } from '../components/RotateHandle';
import { SaveBoardControls } from '../components/SaveBoardControls';
import { SelectionBar } from '../components/SelectionBar';
import { TerrainLegend } from '../components/TerrainLegend';
import { TerrainChoiceDialog } from '../components/TerrainChoiceDialog';
import { TerrainShape } from '../components/TerrainShape';
import { insideTable } from '../components/warTableStyles';
import { copyText } from '../services/clipboard';
import { useBoardAnalysis } from '../hooks/useBoardAnalysis';
import { useBoardDrag } from '../hooks/useBoardDrag';
import { useBoardLayout } from '../hooks/useBoardLayout';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { useEditorKeys } from '../hooks/useEditorKeys';
import { useElementSize } from '../hooks/useElementSize';
import { randomSeed, useGenerator } from '../hooks/useGenerator';
import { useLeaveWarning } from '../hooks/useLeaveWarning';
import { useMatDarkness } from '../hooks/useMatDarkness';
import { DEFAULT_VIEW_OPTIONS, isDefaultView, useBoardSession } from '../hooks/boardSessionContext';
import { useGamePreferences } from '../hooks/gamePreferencesContext';
import { useTerrainLibrary } from '../hooks/libraryContext';
import { useSavedBoards } from '../hooks/savedBoardsContext';
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

/** A name the player gave a board that is not saved, kept for the board it was given to. */
interface DraftName {
  readonly origin: object;
  readonly name: string;
}

/** A new board the player asked for, waiting for them to pick its terrain. */
interface PendingBoard {
  readonly seed: number;
  readonly choice: BoardChoice;
}

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
    mat: matId,
    setMat,
  } = session;
  const { snap, movePairs, showPhotos, showHidden, showDistances, showMat } = session.view;
  const shownMat = findMat(showMat ? matId : null);
  const [matDarkness, setMatDarkness] = useMatDarkness();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const ownCollection = library.pieces.length > 0 ? library.pieces : SAMPLE_COLLECTION;
  const [entry] = useState(() =>
    boardEntry(
      {
        origin: session.editor.present?.origin ?? null,
        openedId: session.opened?.id ?? null,
        source: session.source,
        mat: session.mat,
      },
      ownCollection,
      searchParams.toString(),
      location.state,
    ),
  );
  const [pendingBoard, setPendingBoard] = useState<PendingBoard | null>(null);
  const { status, generate } = useGenerator();
  const layout = useBoardLayout();
  const targets = useCoarsePointer() ? TOUCH_TARGETS : MOUSE_TARGETS;
  // A phone has no room for every piece's distances, so it measures the selected piece only.
  const measuresOnePiece = layout === 'phone' || layout === 'sideways';
  const frameRef = useRef<SVGGElement>(null);
  const [boardArea, boardAreaRef, areaSize] = useElementSize<HTMLDivElement>();
  // The board sits on a war table, whose edge takes some of the space measured for it.
  const boardSpace = insideTable(areaSize);
  const rulesId = useId();
  const [rulesAsked, setRulesAsked] = useState(0);
  const [draftName, setDraftName] = useState<DraftName | null>(null);

  const collection = source.kind === 'own' ? ownCollection : source.pieces;
  const knownIds = useMemo(() => new Set(collection.map((piece) => piece.id)), [collection]);
  // Terrain that is not the library's shows a library photo only where it fits the piece.
  const photos = useMemo(
    () =>
      source.kind === 'own'
        ? library.photos
        : new Map(
            [...library.photos].filter(([id]) => {
              const piece = findById(collection, id);
              return piece !== undefined && photoFits(piece, findById(library.pieces, id));
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
  const showLane = session.view.showLane ?? showsLaneByDefault(setup?.preset ?? chosenPreset);
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
  const unsaved = hasUnsavedChanges(opened, present, matId);
  // The name the account has for the board, which also shows a refused rename undone.
  const shownOpened =
    opened === null
      ? null
      : {
          ...opened,
          name: findById(savedBoards.boards, opened.id)?.name ?? opened.name,
        };
  useLeaveWarning(unsaved);
  const problems = useMemo(
    () =>
      setup === undefined
        ? new Map<string, readonly string[]>()
        : checkBoard(shownPieces, collection, placementRulesFor(setup), unit),
    [setup, shownPieces, collection, unit],
  );

  // Generation reads the player's terrain when it finishes, to see if it changed meanwhile.
  const latestOwn = useRef(ownCollection);
  useEffect(() => {
    latestOwn.current = ownCollection;
  }, [ownCollection]);

  /** Shows the balance rules, opening whichever panel or tab holds them. */
  function askRules(): void {
    setRulesAsked(rulesAsked + 1);
  }

  /** The rules the player has on for a game. */
  function playerRules(next: BoardChoice): RuleId[] {
    const preset = findPreset(next.presetId);
    return preset === undefined ? [] : enabledRulesFor(preset, settings.preferences);
  }

  /** The mat a new board starts on: the one the player picked last. */
  function startingMat(): MatId {
    return settings.preferences.defaultMatId;
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
    void runGeneration(next, seed, OWN_SOURCE, playerRules(next));
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

  /** A new board on a random seed, which the player asked for. */
  function requestRandom(): void {
    requestNew(randomSeed());
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
    setSource(changed === 0 ? OWN_SOURCE : { kind: 'saved', pieces: board.pieces });
    setNotice(changed === 0 ? null : terrainChangedNotice(changed));
    setMat(board.matId);
    setOpened({
      id: board.id,
      name: board.name,
      fingerprint: layoutFingerprint(layout),
      matId: board.matId,
    });
  }

  /** Opens the saved board the address names, or a new board when it cannot be found. */
  function openEntry(boardId: string): void {
    const board = findById(savedBoards.boards, boardId);
    if (board !== undefined) {
      openSaved(board);
      return;
    }
    const next = startingChoice();
    setChoice(next);
    setMat(startingMat());
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
    const content = savedBoardContent(present, collection, name, passed, matId);
    const result = savedBoards.save(content, asCopy ? null : (shownOpened?.id ?? null));
    if (!result.ok) {
      return result.message;
    }
    setOpened({
      id: result.id,
      name: content.name,
      fingerprint: layoutFingerprint(content.layout),
      matId: content.matId,
    });
    return null;
  }

  function renameBoard(name: string): void {
    if (opened !== null) {
      savedBoards.rename(opened.id, name);
    } else if (origin !== undefined) {
      setDraftName({ origin, name });
    }
  }

  function boardName(): string {
    if (shownOpened !== null) {
      return shownOpened.name;
    }
    if (draftName !== null && draftName.origin === origin) {
      return draftName.name;
    }
    return defaultBoardName(
      setup?.preset.name ?? chosenPreset.name,
      setup?.deployment.name ?? '',
      new Date(),
    );
  }

  function saveState(): BoardSaveState {
    if (shownOpened === null) {
      return 'notSaved';
    }
    if (unsaved) {
      return 'unsaved';
    }
    return savedBoards.saving ? 'saving' : 'saved';
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
      const from = linksToOwn(entry.source, ownCollection) ? OWN_SOURCE : entry.source;
      const next = entry.choice ?? startingChoice();
      dispatch({ type: 'cleared' });
      setChoice(next);
      if (entry.picked) {
        settings.choosePreset(next.presetId);
      }
      setSource(from);
      setMat(entry.link.kind === 'valid' ? entry.link.link.matId : startingMat());
      setNotice(linkNotice(entry.link));
      const seed = entry.link.kind === 'valid' ? entry.link.link.seed : randomSeed();
      void runGeneration(next, seed, from, entry.enabledRules ?? playerRules(next));
    } else if (editor.present === null) {
      const next = startingChoice();
      setChoice(next);
      setMat(startingMat());
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
      setNotice(collectionSwitchedNotice(collection === SAMPLE_COLLECTION));
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
      setSource(OWN_SOURCE);
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
        ? boardLinkFor(origin, source, ownCollection, matId)
        : new URLSearchParams([[SAVED_PARAM, opened.id]]).toString();
    if (searchParams.toString() !== search) {
      setSearchParams(search, { replace: true });
    }
  }, [origin, source, ownCollection, opened, matId, searchParams, setSearchParams]);

  /** The share link of the board, which makes the same board again, without hand edits. */
  function shareUrl(): string {
    if (origin === undefined) {
      return window.location.href;
    }
    const search = boardLinkFor(origin, source, ownCollection, matId);
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
    shownSelected === undefined ? undefined : findById(collection, shownSelected.placement.pieceId);
  const measured =
    showDistances && selectedPiece !== undefined && shownSelected !== undefined
      ? measureDetail(selectedPiece, shownSelected.placement, board, unit, upright)
      : null;
  const selection =
    selectedPiece === undefined || shownSelected === undefined
      ? null
      : {
          name: selectedPiece.name,
          problems: problems.get(shownSelected.key) ?? NO_WARNINGS,
          ...(measured === null ? {} : { detail: measured }),
        };
  const order = useMemo(() => placingOrder(pieces), [pieces]);
  const measuredPieces = showDistances
    ? piecesToMeasure(shownPieces, collection, board, editor.selected, measuresOnePiece)
    : [];

  function stepThrough(step: 1 | -1): void {
    const key = stepPiece(order, editor.selected, step);
    if (key !== null) {
      dispatch({ type: 'selected', key });
    }
  }
  const report = analysis.analysis?.report ?? null;
  const shownRules = fairnessInput?.enabledRules ?? NO_RULES;
  const playerRuleIds = enabledRulesFor(chosenPreset, settings.preferences);

  const legend =
    setup === undefined ? null : <TerrainLegend effects={setup.preset.terrainEffects} />;

  const setupPanel = (
    <div className="space-y-6">
      <GeneratorControls
        preset={chosenPreset}
        deploymentId={choice.deploymentId}
        status={status}
        unit={unit}
        ruleCount={playerRuleIds.length}
        settingsError={settings.error}
        onPresetChange={(presetId) => {
          setChoice({ presetId, deploymentId: DEFAULT_DEPLOYMENT_ID });
          settings.choosePreset(presetId);
        }}
        onDeploymentChange={(deploymentId) => {
          setChoice({ ...choice, deploymentId });
        }}
        onGenerate={requestRandom}
        onChooseRules={askRules}
        showGenerate={layout !== 'phone'}
      />
      <MatAccordion
        value={matId}
        onChange={(next) => {
          setMat(next);
          settings.chooseMat(next);
          setView({ showMat: true });
        }}
        darkness={matDarkness}
        onDarknessChange={setMatDarkness}
      />
    </div>
  );

  const header = (
    <BoardHeaderBar
      compact={measuresOnePiece}
      name={boardName()}
      onRename={renameBoard}
      saveState={saveState()}
      code={origin === undefined ? null : seedToCode(origin.seed)}
      edited={present?.edited ?? false}
      onLoadSeed={(seed) => {
        requestNew(seed);
      }}
      onCopyLink={() => copyText(shareUrl())}
      saveControls={
        <SaveBoardControls
          access={savedBoards.access}
          opened={shownOpened}
          name={boardName()}
          hasBoard={present !== null && savedBoards.status === 'ready'}
          error={savedBoards.writeError}
          onSave={saveBoard}
        />
      }
    />
  );

  const fairnessPanel = (
    <FairnessPanel
      analysis={analysis.analysis}
      current={analysis.current}
      error={analysis.error}
      balance={fairnessInput?.balance ?? null}
      enabledRules={shownRules}
      rulesId={rulesId}
      rules={{
        chosen: playerRuleIds,
        onChange: (rule, enabled) => {
          settings.switchRule(chosenPreset, rule, enabled);
        },
        canReset:
          !usesDefaultRules(chosenPreset, settings.preferences) || !isDefaultView(session.view),
        onReset: () => {
          settings.resetRules(chosenPreset);
          setView(DEFAULT_VIEW_OPTIONS);
        },
      }}
      generating={status.running}
      onGenerate={requestRandom}
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
      mat={shownMat}
      matDarkness={matDarkness}
      frameRef={frameRef}
      upright={upright}
      size={drawnSize}
      description={boardDescription(setup, shownPieces.length, unit)}
      dimmed={status.running}
      badge={
        // Phones show the verdict in the sheet below the board, which keeps the corner clear.
        report === null || measuresOnePiece ? undefined : (
          <FairBadge
            report={report}
            enabledRules={shownRules}
            onOpen={layout === 'tablet' ? askRules : undefined}
          />
        )
      }
      onBackgroundPointerDown={() => {
        dispatch({ type: 'selected', key: null });
      }}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.cancel}
    >
      {setup !== undefined && (
        <DeploymentZones
          board={setup.board}
          deployment={setup.deployment}
          upright={upright}
          labelled
        />
      )}
      {showHidden && analysis.analysis !== null && (
        <HiddenAreaOverlay hidden={analysis.analysis.hidden} />
      )}
      {shownPieces.map((boardPiece) => {
        const piece = findById(collection, boardPiece.placement.pieceId);
        if (piece === undefined) {
          return null;
        }
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
      {measuredPieces.length > 0 && (
        <EdgeDistanceOverlay
          pieces={measuredPieces}
          board={board}
          unit={unit}
          upright={upright}
          pixelSize={pixelSize}
          fontPixels={measuresOnePiece ? 11 : 12}
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
              className="border-warn-line bg-warn-soft text-warn-ink shadow-shade flex items-start gap-2 rounded-sm border py-1 pr-1 pl-3 text-sm shadow-lg"
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
        header={header}
        setup={setupPanel}
        fairness={fairnessPanel}
        rulesAsked={rulesAsked}
        rulesId={rulesId}
        pieces={piecesPanel}
        toolbar={
          <BoardToolbar
            canUndo={canUndo(editor)}
            canRedo={canRedo(editor)}
            selectionName={selection?.name ?? null}
            snap={snap}
            movePairs={movePairs}
            showPhotos={showPhotos}
            showDistances={showDistances}
            showMat={showMat}
            hasPieces={order.length > 0}
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
            onShowDistancesChange={(value) => {
              setView({ showDistances: value });
            }}
            onShowMatChange={(value) => {
              setView({ showMat: value });
            }}
            onStep={stepThrough}
          />
        }
        boardAreaRef={boardAreaRef}
        board={boardDrawing}
        legend={legend}
        footer={<BoardFooter legend={legend} selection={selection} unit={unit} />}
        phoneButtons={
          <PhoneBoardButtons
            canUndo={canUndo(editor)}
            canRedo={canRedo(editor)}
            onUndo={undo}
            onRedo={redo}
          />
        }
        boardOptions={
          <BoardOptionsButton
            look={layout === 'sideways' ? 'round' : 'bar'}
            layers={{ ...session.view, showLane }}
            onLayersChange={setView}
            matDarkness={matDarkness}
            hasMatPicture={findMat(matId).tileWidth !== null}
            onMatDarknessChange={setMatDarkness}
          />
        }
        selectionBar={
          selection === null ||
          shownSelected === undefined ||
          selectedPiece === undefined ? null : (
            <SelectionBar
              name={selection.name}
              problems={selection.problems}
              onTurn={turn}
              onRemove={removeSelected}
            />
          )
        }
        measureBar={
          showDistances && measuresOnePiece ? (
            <MeasureStepper
              current={
                selection === null || editor.selected === null
                  ? null
                  : { name: selection.name, position: order.indexOf(editor.selected) + 1 }
              }
              total={order.length}
              onStep={stepThrough}
            />
          ) : null
        }
        summary={
          <div className="flex items-center gap-2.5">
            <SheetVerdictButton report={report} enabledRules={shownRules} onOpen={askRules} />
            <button
              type="button"
              disabled={status.running}
              onClick={requestRandom}
              className={`${BUTTON_STYLES.primary} h-11 shrink-0 px-3.5`}
            >
              <SparklesIcon className="size-4" aria-hidden="true" />
              {status.running ? 'Generating…' : 'Generate'}
            </button>
          </div>
        }
      />
      <FairnessAnnouncer report={report} />
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
