import { useState } from 'react';
import { Link } from 'react-router';
import {
  canSetQuantity,
  copyDraft,
  countPieces,
  draftFromPiece,
  EMPTY_DRAFT,
  LIBRARY_LIMITS,
  sampleLibrary,
  type LibraryPiece,
  type PieceDraft,
  type PieceFields,
} from '../domain/library';
import { AppHeader } from '../components/AppHeader';
import { CollectionCheck } from '../components/CollectionCheck';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyLibrary } from '../components/EmptyLibrary';
import { LibraryMessages } from '../components/LibraryMessages';
import { PhotoCropper } from '../components/PhotoCropper';
import { PieceForm } from '../components/PieceForm';
import { PieceList } from '../components/PieceList';
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
  const library = useTerrainLibrary();
  const [form, setForm] = useState<OpenForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<LibraryPiece | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const photoEditor = usePhotoEditor((pieceId, photo) => {
    const piece = library.pieces.find((candidate) => candidate.id === pieceId);
    if (piece !== undefined) {
      void run(() => library.setPhoto(piece, photo));
    }
  });
  const { pieces } = library;

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

  async function savePiece(fields: PieceFields): Promise<void> {
    if (form === null) {
      return;
    }
    const { editing } = form;
    setBusy(true);
    setFormError(null);
    const failure =
      editing === null
        ? await library.addPieces([{ ...fields, id: library.newId(), image: null }])
        : await library.updatePiece({ ...editing, ...fields });
    setBusy(false);
    if (failure === null) {
      setForm(null);
    } else {
      setFormError(failure);
    }
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

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <AppHeader />
      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-labelledby="library-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 id="library-heading" className="text-2xl font-bold">
                Your terrain
              </h1>
              <p className="text-sm text-stone-400">{totals(pieces)}</p>
            </div>
            <button
              type="button"
              disabled={busy || pieces.length >= LIBRARY_LIMITS.maxKinds}
              onClick={() => {
                openForm('Add a piece', EMPTY_DRAFT, null);
              }}
              className="rounded bg-amber-500 px-3 py-1.5 font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
            >
              Add a piece
            </button>
          </div>
          {!library.persistent && (
            <p className="rounded-lg border border-amber-400/50 bg-amber-950/50 p-3 text-sm text-amber-100">
              Your library isn&apos;t saved yet: it lasts until you reload the page. Sign-in to save
              it is coming next.
            </p>
          )}
          <LibraryMessages
            loadError={library.loadError}
            problems={library.problems}
            actionError={photoEditor.error ?? actionError}
            loading={library.status === 'loading' || photoEditor.busy === 'loading'}
          />
          {pieces.length === 0 && library.status === 'ready' ? (
            <EmptyLibrary
              busy={busy}
              onAddSample={() => {
                void run(() => library.addPieces(sampleLibrary(library.newId)));
              }}
            />
          ) : (
            <PieceList
              pieces={pieces}
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
        </section>
        <div className="space-y-4">
          {form !== null && (
            <PieceForm
              key={form.key}
              title={form.title}
              initial={form.initial}
              unit={unit}
              library={pieces}
              editing={form.editing}
              saving={busy}
              error={formError}
              onSave={(fields) => {
                void savePiece(fields);
              }}
              onCancel={() => {
                setForm(null);
              }}
            />
          )}
          {pieces.length > 0 && <CollectionCheck pieces={pieces} unit={unit} />}
          <p className="text-sm text-stone-400">
            {pieces.length === 0
              ? 'Until you add pieces, boards use the built-in sample set.'
              : 'New boards use the pieces in your library.'}{' '}
            <Link to="/board" className="text-amber-300 underline hover:text-amber-200">
              Go to the board
            </Link>
          </p>
        </div>
      </main>
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
    </div>
  );
}

function totals(pieces: readonly LibraryPiece[]): string {
  const { maxPieces } = LIBRARY_LIMITS;
  return `${String(pieces.length)} kinds of piece, ${String(countPieces(pieces))} of ${String(maxPieces)} pieces`;
}
