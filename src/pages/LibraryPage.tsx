import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  canSetQuantity,
  copyDraft,
  countPieces,
  draftFromPiece,
  EMPTY_DRAFT,
  filterLibrary,
  LIBRARY_LIMITS,
  newLibraryPiece,
  NO_FILTER,
  sampleLibrary,
  typesInLibrary,
  type LibraryFilter,
  type LibraryPiece,
  type PieceDraft,
  type PieceFields,
} from '../domain/library';
import type { EncodedPhoto } from '../domain/imageCrop';
import { BUTTON_STYLES } from '../components/buttonStyles';
import { CollectionCheck } from '../components/CollectionCheck';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyLibrary } from '../components/EmptyLibrary';
import { LibraryFilterBar } from '../components/LibraryFilterBar';
import { LibraryMessages } from '../components/LibraryMessages';
import { NotSavedNote } from '../components/NotSavedNote';
import { PageHeader } from '../components/PageHeader';
import { PhotoCropper } from '../components/PhotoCropper';
import { PieceForm } from '../components/PieceForm';
import { PieceGrid } from '../components/PieceGrid';
import { SaveStatus } from '../components/SaveStatus';
import { SideSheet } from '../components/SideSheet';
import { useAuth } from '../hooks/authContext';
import type { DraftPhoto, PhotoChange } from '../hooks/useDraftPhoto';
import { useGamePreferences } from '../hooks/gamePreferencesContext';
import { useTerrainLibrary } from '../hooks/libraryContext';
import { usePhotoEditor } from '../hooks/usePhotoEditor';
import { useUnits } from '../hooks/unitsContext';

interface OpenForm {
  readonly title: string;
  readonly initial: PieceDraft;
  /** The piece being changed, or null when adding one. */
  readonly editing: LibraryPiece | null;
  /** Changes whenever a new form opens, so the form starts from its new values. */
  readonly key: number;
}

/** The player's own terrain: add, change and remove pieces, and see if they are enough. */
export function LibraryPage() {
  const { unit } = useUnits();
  const { preferences } = useGamePreferences();
  const library = useTerrainLibrary();
  const auth = useAuth();
  const [form, setForm] = useState<OpenForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<LibraryPiece | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const photoEditor = usePhotoEditor((cropped, photo) => {
    const piece = library.pieces.find((candidate) => candidate.id === cropped.id);
    if (piece !== undefined) {
      void run(() => library.setPhoto(piece, photo));
    }
  });
  const [filter, setFilter] = useState<LibraryFilter>(NO_FILTER);
  const { pieces } = library;
  const types = typesInLibrary(pieces);
  // A type chip disappears with the last piece of its type; its filter goes with it.
  const shownFilter =
    filter.type !== null && !types.includes(filter.type) ? { ...filter, type: null } : filter;
  const shown = filterLibrary(pieces, shownFilter);
  const filtering = shownFilter.search.trim() !== '' || shownFilter.type !== null;
  const canAdd = !busy && pieces.length < LIBRARY_LIMITS.maxKinds;

  /** Runs one change to the library at a time and shows what went wrong, if anything. */
  async function run(change: () => Promise<string | null>): Promise<string | null> {
    setBusy(true);
    setActionError(null);
    const failure = await change();
    setBusy(false);
    setActionError(failure);
    return failure;
  }

  function openForm(title: string, initial: PieceDraft, editing: LibraryPiece | null): void {
    setFormError(null);
    setForm({ title, initial, editing, key: (form?.key ?? 0) + 1 });
  }

  async function savePiece(fields: PieceFields, photo: PhotoChange): Promise<void> {
    if (form === null) {
      return;
    }
    const { editing } = form;
    setBusy(true);
    setFormError(null);
    const newPhoto = photo.changed ? photo.photo : null;
    const saved: LibraryPiece =
      editing === null
        ? newLibraryPiece(fields, library.newId(), newPhoto?.ratio ?? null)
        : { ...latestVersion(pieces, editing), ...fields };
    const failure =
      editing === null
        ? await library.addPieces([saved], photosFor(saved, newPhoto))
        : await saveChanges(saved, photo);
    setBusy(false);
    if (failure === null) {
      setForm(null);
      showPiece(saved);
    } else {
      setFormError(failure);
    }
  }

  /** Saves an edited piece in one write, with its new photo or without its old one if those changed. */
  function saveChanges(piece: LibraryPiece, photo: PhotoChange): Promise<string | null> {
    if (!photo.changed) {
      return library.updatePiece(piece);
    }
    return photo.photo === null ? library.removePhoto(piece) : library.setPhoto(piece, photo.photo);
  }

  async function confirmDelete(): Promise<void> {
    if (deleting === null) {
      return;
    }
    setBusy(true);
    const failure = await library.deletePiece(deleting);
    setBusy(false);
    setDeleteError(failure);
    if (failure === null) {
      if (form?.editing?.id === deleting.id) {
        setForm(null);
      }
      setDeleting(null);
    }
  }

  /** Clears the filter when it would hide the piece the player just saved. */
  function showPiece(piece: LibraryPiece): void {
    if (filterLibrary([piece], shownFilter).length === 0) {
      setFilter(NO_FILTER);
    }
  }

  function addPiece(): void {
    openForm('Add a piece', EMPTY_DRAFT, null);
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-wrap items-start gap-7 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-12">
        <section
          aria-labelledby="library-heading"
          className="flex min-w-0 flex-[999_1_640px] flex-col gap-5"
        >
          <PageHeader
            id="library-heading"
            title="Your terrain"
            details={[
              totals(pieces),
              library.persistent && <SaveStatus key="save" saving={library.saving} />,
            ]}
            actions={
              <span className="hidden md:block">
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={addPiece}
                  className={`${BUTTON_STYLES.primary} h-11 px-[18px] text-[19px]`}
                >
                  <PlusIcon className="size-[18px]" aria-hidden="true" />
                  Add a piece
                </button>
              </span>
            }
          />
          {!library.persistent && library.status !== 'loading' && (
            <NotSavedNote signedIn={auth.user !== null} />
          )}
          <LibraryMessages
            loadError={library.loadError}
            problems={library.problems}
            actionError={photoEditor.error ?? actionError ?? library.writeError}
            loading={library.status === 'loading' || photoEditor.busy === 'loading'}
          />
          {pieces.length === 0 && library.status === 'ready' && (
            <EmptyLibrary
              busy={busy}
              onAddSample={() => {
                void run(() => library.addPieces(sampleLibrary(library.newId)));
              }}
            />
          )}
          {pieces.length > 0 && (
            <>
              <LibraryFilterBar filter={shownFilter} types={types} onChange={setFilter} />
              <p role="status" className="sr-only">
                {filtering ? matchText(shown.length) : ''}
              </p>
              {shown.length === 0 ? (
                <p className="text-muted rounded-sm border border-dashed border-[#6e5428] p-[18px] text-center">
                  No pieces match.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setFilter(NO_FILTER);
                    }}
                    className="text-brass-glow underline"
                  >
                    Show all pieces
                  </button>
                </p>
              ) : (
                <PieceGrid
                  shown={shown}
                  library={pieces}
                  photos={library.photos}
                  unit={unit}
                  busy={busy}
                  onQuantityChange={(piece, quantity) => {
                    if (canSetQuantity(pieces, piece, quantity)) {
                      void run(() => library.updatePiece({ ...piece, quantity }));
                    }
                  }}
                  onEdit={(piece) => {
                    openForm(`Edit ${piece.name}`, draftFromPiece(piece, unit), piece);
                  }}
                  onDuplicate={(piece) => {
                    openForm('Add a copy', copyDraft(piece, unit), null);
                  }}
                  onDelete={(piece) => {
                    setDeleteError(null);
                    setDeleting(piece);
                  }}
                  onPickPhoto={(piece, file) => {
                    void photoEditor.open(piece, file);
                  }}
                  onRemovePhoto={(piece) => {
                    void run(() => library.removePhoto(piece));
                  }}
                />
              )}
              <p className="text-faint text-xs italic">
                Pictures are drawn to the same scale (one grid square is 1″), so you can compare
                sizes at a glance. A photo replaces the drawing once you add one.
              </p>
            </>
          )}
        </section>
        <aside className="flex max-w-[400px] min-w-0 flex-[1_1_320px] flex-col gap-3.5 xl:sticky xl:top-20">
          {pieces.length > 0 && (
            <CollectionCheck pieces={pieces} preferences={preferences} unit={unit} />
          )}
          <p className="text-muted text-xs">
            {pieces.length === 0
              ? 'Until you add pieces, boards use the built-in sample set.'
              : 'New boards use the pieces in your library.'}{' '}
            <Link to="/board" className="text-brass-glow underline">
              Go to the board
            </Link>
          </p>
        </aside>
      </main>
      <button
        type="button"
        disabled={!canAdd}
        onClick={addPiece}
        aria-label="Add a piece"
        title="Add a piece"
        className="bg-accent text-on-accent shadow-shade hover:bg-accent-hover focus-visible:outline-accent-ink fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 grid size-14 place-items-center rounded-full shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 md:hidden"
      >
        <PlusIcon className="size-6" aria-hidden="true" />
      </button>
      {form !== null && (
        <SideSheet
          label={form.title}
          busy={busy}
          onCancel={() => {
            setForm(null);
          }}
        >
          <PieceForm
            key={form.key}
            title={form.title}
            initial={form.initial}
            unit={unit}
            library={pieces}
            editing={form.editing}
            savedPhoto={form.editing === null ? undefined : library.photos.get(form.editing.id)}
            saving={busy}
            error={formError}
            onSave={(fields, photo) => {
              void savePiece(fields, photo);
            }}
            onCancel={() => {
              setForm(null);
            }}
          />
        </SideSheet>
      )}
      {deleting !== null && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message={`All ${String(deleting.quantity)} of them leave your library, with their photo. This can't be undone.`}
          confirmLabel="Delete"
          busy={busy}
          error={deleteError}
          onConfirm={() => {
            void confirmDelete();
          }}
          onCancel={() => {
            setDeleting(null);
          }}
        />
      )}
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
    </>
  );
}

/** The piece as the library has it now, with any photo added or removed while the form was open. */
function latestVersion(pieces: readonly LibraryPiece[], piece: LibraryPiece): LibraryPiece {
  return pieces.find((candidate) => candidate.id === piece.id) ?? piece;
}

/** The photo a new piece comes with, keyed by its id as the library takes it. */
function photosFor(
  piece: LibraryPiece,
  photo: DraftPhoto | null,
): ReadonlyMap<string, EncodedPhoto> | undefined {
  return photo === null ? undefined : new Map([[piece.id, photo.photo]]);
}

function totals(pieces: readonly LibraryPiece[]): string {
  const { maxPieces } = LIBRARY_LIMITS;
  return `${String(pieces.length)} kinds of piece, ${String(countPieces(pieces))} of ${String(maxPieces)} pieces`;
}

function matchText(count: number): string {
  return count === 1 ? '1 piece matches.' : `${String(count)} pieces match.`;
}
