import type { ReactNode, RefObject } from 'react';
import type { BoardAnalysis } from '../domain/boardAnalysis';
import type { Board } from '../domain/board';
import { inchesPerPixel, type ScreenSize } from '../domain/boardFit';
import { piecesToMeasure } from '../domain/edgeDistance';
import type { BoardPiece } from '../domain/editor';
import { findById } from '../domain/findById';
import type { GameSetup } from '../domain/gameSetup';
import type { Mat } from '../domain/mats';
import type { TerrainPiece } from '../domain/terrain';
import type { LengthUnit } from '../domain/units';
import type { BoardDrag } from '../hooks/useBoardDrag';
import type { StoredPhoto } from '../hooks/useLibraryPhotos';
import { boardDescription } from './boardNotices';
import { BoardView } from './BoardView';
import { DeploymentZones } from './DeploymentZones';
import { EdgeDistanceOverlay } from './EdgeDistanceOverlay';
import { HiddenAreaOverlay } from './HiddenAreaOverlay';
import { LaneOverlay } from './LaneOverlay';
import type { LayerSettings } from './LayersMenu';
import { pieceLabel } from './pieceLabel';
import { RotateHandle } from './RotateHandle';
import { TerrainShape } from './TerrainShape';

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

interface BoardDrawingProps {
  board: Board;
  /** Undefined before the first board, which leaves the board empty. */
  setup: GameSetup | undefined;
  mat: Mat;
  matDarkness: number;
  frameRef: RefObject<SVGGElement | null>;
  upright: boolean;
  size: ScreenSize;
  unit: LengthUnit;
  /** The pieces as shown, with a drag in progress. */
  pieces: readonly BoardPiece[];
  collection: readonly TerrainPiece[];
  /** Placement problems, keyed by board key. */
  problems: ReadonlyMap<string, readonly string[]>;
  photos: ReadonlyMap<string, StoredPhoto>;
  layers: LayerSettings;
  selectedKey: string | null;
  analysis: BoardAnalysis | null;
  /** The longest clear lane the game allows, in inches. */
  laneLimit: number;
  /** On a small screen only the selected piece is measured, with smaller labels. */
  compact: boolean;
  /** Bigger targets for fingers. */
  coarsePointer: boolean;
  dimmed: boolean;
  badge?: ReactNode;
  drag: BoardDrag;
  onSelect: (key: string | null) => void;
}

/** The board with its zones, terrain, overlays and the handle that turns the selected piece. */
export function BoardDrawing({
  board,
  setup,
  mat,
  matDarkness,
  frameRef,
  upright,
  size,
  unit,
  pieces,
  collection,
  problems,
  photos,
  layers,
  selectedKey,
  analysis,
  laneLimit,
  compact,
  coarsePointer,
  dimmed,
  badge,
  drag,
  onSelect,
}: BoardDrawingProps) {
  const targets = coarsePointer ? TOUCH_TARGETS : MOUSE_TARGETS;
  const pixelSize = inchesPerPixel(board, size, upright) ?? UNMEASURED_PIXEL_SIZE;
  const selected = pieces.find((piece) => piece.key === selectedKey);
  const selectedPiece =
    selected === undefined ? undefined : findById(collection, selected.placement.pieceId);
  const measuredPieces = layers.showDistances
    ? piecesToMeasure(pieces, collection, board, selectedKey, compact)
    : [];

  return (
    <BoardView
      board={board}
      mat={mat}
      matDarkness={matDarkness}
      frameRef={frameRef}
      upright={upright}
      size={size}
      description={boardDescription(setup, pieces.length, unit)}
      dimmed={dimmed}
      badge={badge}
      onBackgroundPointerDown={() => {
        onSelect(null);
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
      {layers.showHidden && analysis !== null && <HiddenAreaOverlay hidden={analysis.hidden} />}
      {pieces.map((boardPiece) => {
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
            selected={selectedKey === boardPiece.key}
            hasProblems={issues !== undefined}
            photoUrl={layers.showPhotos ? photos.get(piece.id)?.url : undefined}
            hitWidth={targets.hitOutline * pixelSize}
            onPointerDown={(event) => {
              drag.startMove(boardPiece.key, event);
            }}
            onFocus={() => {
              onSelect(boardPiece.key);
            }}
          />
        );
      })}
      {layers.showLane && setup !== undefined && analysis?.lane != null && (
        <LaneOverlay lane={analysis.lane} limit={laneLimit} unit={unit} upright={upright} />
      )}
      {measuredPieces.length > 0 && (
        <EdgeDistanceOverlay
          pieces={measuredPieces}
          board={board}
          unit={unit}
          upright={upright}
          pixelSize={pixelSize}
          fontPixels={compact ? 11 : 12}
        />
      )}
      {selected !== undefined && selectedPiece !== undefined && (
        <RotateHandle
          center={selected.placement.position}
          rotation={selected.placement.rotation}
          reach={selectedPiece.footprint.depth / 2 + targets.handleGap * pixelSize}
          radius={targets.handleRadius * pixelSize}
          onPointerDown={(event) => {
            drag.startRotate(selected.key, event);
          }}
        />
      )}
    </BoardView>
  );
}
