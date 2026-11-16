import { useId, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { fairnessInputFor } from '../domain/boardAnalysis';
import { checkBoard } from '../domain/boardChecks';
import { boardEntry } from '../domain/boardEntry';
import { drawsUpright, fitBoard, screenMoveToBoard } from '../domain/boardFit';
import { DEFAULT_DEPLOYMENT_ID, sourceKind } from '../domain/boardSource';
import { canRedo, canUndo, withPreview, type BoardPiece } from '../domain/editor';
import type { RuleId } from '../domain/fairness';
import { findById } from '../domain/findById';
import { enabledRulesFor, startingPreset, usesDefaultRules } from '../domain/gamePreferences';
import { placementRulesFor, resolveGameSetup } from '../domain/gameSetup';
import { prepareCollection } from '../domain/generator';
import { findMat } from '../domain/mats';
import { findPreset, showsLaneByDefault } from '../domain/presets';
import { seedToCode } from '../domain/random';
import { SAMPLE_COLLECTION } from '../domain/sampleCollection';
import { photoFits } from '../domain/savedBoard';
import { BoardDrawing } from '../components/BoardDrawing';
import { BoardFooter } from '../components/BoardFooter';
import { BoardHeaderBar } from '../components/BoardHeaderBar';
import { BoardNotice } from '../components/BoardNotice';
import { BoardOptionsButton } from '../components/BoardOptionsButton';
import { BoardSetupPanel } from '../components/BoardSetupPanel';
import { BoardSummary } from '../components/BoardSummary';
import { BoardToolbar } from '../components/BoardToolbar';
import { BoardWorkspace } from '../components/BoardWorkspace';
import { FairBadge } from '../components/FairBadge';
import { FairnessAnnouncer } from '../components/FairnessAnnouncer';
import { FairnessPanel } from '../components/FairnessPanel';
import { measureDetail } from '../components/measureText';
import { MeasureStepper } from '../components/MeasureStepper';
import { PhoneBoardButtons } from '../components/PhoneBoardButtons';
import { PiecePalette } from '../components/PiecePalette';
import { SaveBoardControls } from '../components/SaveBoardControls';
import { SelectionBar } from '../components/SelectionBar';
import { TerrainChoiceDialog } from '../components/TerrainChoiceDialog';
import { TerrainLegend } from '../components/TerrainLegend';
import { insideTable } from '../components/warTableStyles';
import { copyText } from '../services/clipboard';
import { DEFAULT_VIEW_OPTIONS, isDefaultView, useBoardSession } from '../hooks/boardSessionContext';
import { useGamePreferences } from '../hooks/gamePreferencesContext';
import { useTerrainLibrary } from '../hooks/libraryContext';
import { useSavedBoards } from '../hooks/savedBoardsContext';
import { useUnits } from '../hooks/unitsContext';
import { useBoardAnalysis } from '../hooks/useBoardAnalysis';
import { useBoardDrag } from '../hooks/useBoardDrag';
import { useBoardGeneration } from '../hooks/useBoardGeneration';
import { useBoardLayout } from '../hooks/useBoardLayout';
import { useBoardLifecycle } from '../hooks/useBoardLifecycle';
import { useBoardSaving } from '../hooks/useBoardSaving';
import { useBoardUrl } from '../hooks/useBoardUrl';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { useEditorKeys } from '../hooks/useEditorKeys';
import { useElementSize } from '../hooks/useElementSize';
import { useMatDarkness } from '../hooks/useMatDarkness';
import { useSelectionActions } from '../hooks/useSelectionActions';

const NO_PIECES: readonly BoardPiece[] = [];
const NO_WARNINGS: readonly string[] = [];
const NO_RULES: readonly RuleId[] = [];

/** Generate a board, see how fair it is, and edit it by hand. */
export function BoardPage() {
  const { unit } = useUnits();
  const library = useTerrainLibrary();
  const savedBoards = useSavedBoards();
  const settings = useGamePreferences();
  const session = useBoardSession();
  const { editor, dispatch, choice, setChoice, source, notice, setNotice, setView } = session;
  const { opened, mat: matId, setMat } = session;
  const { snap, movePairs, showDistances, showMat } = session.view;
  const [matDarkness, setMatDarkness] = useMatDarkness();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
  const layout = useBoardLayout();
  const coarsePointer = useCoarsePointer();
  // A phone has no room for every piece's distances, so it measures the selected piece only.
  const measuresOnePiece = layout === 'phone' || layout === 'sideways';
  const frameRef = useRef<SVGGElement>(null);
  const [boardArea, boardAreaRef, areaSize] = useElementSize<HTMLDivElement>();
  // The board sits on a war table, whose edge takes some of the space measured for it.
  const boardSpace = insideTable(areaSize);
  const rulesId = useId();
  const [rulesAsked, setRulesAsked] = useState(0);

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
  const saving = useBoardSaving({
    session,
    savedBoards,
    collection,
    fairnessInput,
    setup,
    chosenPreset,
  });
  const problems = useMemo(
    () =>
      setup === undefined
        ? new Map<string, readonly string[]>()
        : checkBoard(shownPieces, collection, placementRulesFor(setup), unit),
    [setup, shownPieces, collection, unit],
  );

  const generation = useBoardGeneration(session, settings, ownCollection);
  const { status, requestRandom } = generation;
  useBoardLifecycle({
    session,
    settings,
    library,
    savedBoards,
    entry,
    ownCollection,
    collection,
    knownIds,
    generation,
  });
  const { shareUrl } = useBoardUrl({ origin, source, ownCollection, opened, matId });
  const selection = useSelectionActions({
    selectedKey: editor.selected,
    dispatch,
    pieces,
    shownPieces,
    collection,
    board,
    snap,
    movePairs,
  });
  const { shownSelected, selectedPiece, order, turn, removeSelected, undo, redo } = selection;
  const { stepThrough } = selection;

  /** Shows the balance rules, opening whichever panel or tab holds them. */
  function askRules(): void {
    setRulesAsked(rulesAsked + 1);
  }

  useEditorKeys(boardArea, {
    hasSelection: selection.selected !== undefined,
    undo,
    redo,
    nudge: (move) => {
      selection.nudge(screenMoveToBoard(move, upright));
    },
    turn,
    remove: removeSelected,
    escape: () => {
      drag.cancel();
      dispatch({ type: 'selected', key: null });
    },
  });

  const measured =
    showDistances && selectedPiece !== undefined && shownSelected !== undefined
      ? measureDetail(selectedPiece, shownSelected.placement, board, unit, upright)
      : null;
  const selected =
    selectedPiece === undefined || shownSelected === undefined
      ? null
      : {
          name: selectedPiece.name,
          problems: problems.get(shownSelected.key) ?? NO_WARNINGS,
          ...(measured === null ? {} : { detail: measured }),
        };
  const report = analysis.analysis?.report ?? null;
  const shownRules = fairnessInput?.enabledRules ?? NO_RULES;
  const playerRuleIds = enabledRulesFor(chosenPreset, settings.preferences);
  const legend =
    setup === undefined ? null : <TerrainLegend effects={setup.preset.terrainEffects} />;

  return (
    <>
      <BoardWorkspace
        layout={layout}
        notice={
          notice === null ? null : (
            <BoardNotice
              notice={notice}
              onDismiss={() => {
                setNotice(null);
              }}
            />
          )
        }
        header={
          <BoardHeaderBar
            compact={measuresOnePiece}
            name={saving.boardName()}
            onRename={saving.renameBoard}
            saveState={saving.saveState()}
            code={origin === undefined ? null : seedToCode(origin.seed)}
            edited={present?.edited ?? false}
            onLoadSeed={(seed) => {
              generation.requestNew(seed);
            }}
            onCopyLink={() => copyText(shareUrl())}
            saveControls={
              <SaveBoardControls
                access={savedBoards.access}
                opened={saving.shownOpened}
                name={saving.boardName()}
                hasBoard={present !== null && savedBoards.status === 'ready'}
                error={savedBoards.writeError}
                onSave={saving.saveBoard}
              />
            }
          />
        }
        setup={
          <BoardSetupPanel
            preset={chosenPreset}
            choice={choice}
            status={status}
            unit={unit}
            ruleCount={playerRuleIds.length}
            settingsError={settings.error}
            showGenerate={layout !== 'phone'}
            mat={matId}
            matDarkness={matDarkness}
            onPresetChange={(presetId) => {
              setChoice({ presetId, deploymentId: DEFAULT_DEPLOYMENT_ID });
              settings.choosePreset(presetId);
            }}
            onDeploymentChange={(deploymentId) => {
              setChoice({ ...choice, deploymentId });
            }}
            onGenerate={requestRandom}
            onChooseRules={askRules}
            onMatChange={(next) => {
              setMat(next);
              settings.chooseMat(next);
              setView({ showMat: true });
            }}
            onMatDarknessChange={setMatDarkness}
          />
        }
        fairness={
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
                !usesDefaultRules(chosenPreset, settings.preferences) ||
                !isDefaultView(session.view),
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
            showHidden={session.view.showHidden}
            onShowLaneChange={(value) => {
              setView({ showLane: value });
            }}
            onShowHiddenChange={(value) => {
              setView({ showHidden: value });
            }}
          />
        }
        rulesAsked={rulesAsked}
        rulesId={rulesId}
        pieces={
          <PiecePalette
            collection={collection}
            source={sourceKind(source, collection)}
            pieces={pieces}
            photos={photos}
            unit={unit}
            canAdd={present !== null}
            onAdd={selection.addPiece}
          />
        }
        toolbar={
          <BoardToolbar
            canUndo={canUndo(editor)}
            canRedo={canRedo(editor)}
            selectionName={selected?.name ?? null}
            snap={snap}
            movePairs={movePairs}
            showPhotos={session.view.showPhotos}
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
        board={
          <BoardDrawing
            board={board}
            setup={setup}
            mat={findMat(showMat ? matId : null)}
            matDarkness={matDarkness}
            frameRef={frameRef}
            upright={upright}
            size={drawnSize}
            unit={unit}
            pieces={shownPieces}
            collection={collection}
            problems={problems}
            photos={photos}
            layers={{ ...session.view, showLane }}
            selectedKey={editor.selected}
            analysis={analysis.analysis}
            laneLimit={
              fairnessInput?.balance.maxClearLane ?? setup?.preset.balance.maxClearLane ?? 0
            }
            compact={measuresOnePiece}
            coarsePointer={coarsePointer}
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
            drag={drag}
            onSelect={(key) => {
              dispatch({ type: 'selected', key });
            }}
          />
        }
        legend={legend}
        footer={<BoardFooter legend={legend} selection={selected} unit={unit} />}
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
          selected === null ? null : (
            <SelectionBar
              name={selected.name}
              problems={selected.problems}
              onTurn={turn}
              onRemove={removeSelected}
            />
          )
        }
        measureBar={
          showDistances && measuresOnePiece ? (
            <MeasureStepper
              current={
                selected === null || editor.selected === null
                  ? null
                  : { name: selected.name, position: order.indexOf(editor.selected) + 1 }
              }
              total={order.length}
              onStep={stepThrough}
            />
          ) : null
        }
        summary={
          <BoardSummary
            report={report}
            enabledRules={shownRules}
            generating={status.running}
            onGenerate={requestRandom}
            onOpenRules={askRules}
          />
        }
      />
      <FairnessAnnouncer report={report} />
      {generation.asksTerrain && (
        <TerrainChoiceDialog
          onBoardTerrain={() => {
            generation.answerPending('boardTerrain');
          }}
          onLibrary={() => {
            generation.answerPending('library');
          }}
          onCancel={() => {
            generation.answerPending('cancel');
          }}
        />
      )}
    </>
  );
}
