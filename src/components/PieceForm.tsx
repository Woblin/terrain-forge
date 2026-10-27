import { useId, useState, type SubmitEvent } from 'react';
import {
  draftFootprint,
  LIBRARY_LIMITS,
  validatePieceDraft,
  type DraftErrors,
  type DraftField,
  type LibraryPiece,
  type PieceDraft,
  type PieceFields,
} from '../domain/library';
import { TERRAIN_TYPES, type TerrainType } from '../domain/terrain';
import type { LengthUnit } from '../domain/units';
import { FootprintPreview } from './FootprintPreview';
import { TERRAIN_STYLES } from './terrainStyles';

interface PieceFormProps {
  title: string;
  initial: PieceDraft;
  unit: LengthUnit;
  library: readonly LibraryPiece[];
  /** The piece being edited, or null when adding a new one. */
  editing: LibraryPiece | null;
  saving: boolean;
  /** Why the last save failed. */
  error: string | null;
  onSave: (fields: PieceFields) => void;
  onCancel: () => void;
}

const INPUT = 'w-full rounded-lg border border-line-strong bg-raised px-2 py-1.5';
const NO_ERRORS: DraftErrors = {};

/** Adding or changing one piece: name, type, shape, size and how many the player owns. */
export function PieceForm({
  title,
  initial,
  unit,
  library,
  editing,
  saving,
  error,
  onSave,
  onCancel,
}: PieceFormProps) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<DraftErrors>(NO_ERRORS);
  const unitName = unit === 'in' ? 'inches' : 'cm';

  function change(next: Partial<PieceDraft>): void {
    setDraft({ ...draft, ...next });
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const result = validatePieceDraft(draft, unit, library, editing);
    if (result.ok) {
      setErrors(NO_ERRORS);
      onSave(result.fields);
    } else {
      setErrors(result.errors);
    }
  }

  function fieldProps(field: DraftField) {
    const message = errors[field];
    return {
      id: `${id}-${field}`,
      'aria-invalid': message !== undefined,
      'aria-describedby': message === undefined ? undefined : `${id}-${field}-error`,
    };
  }

  function fieldError(field: DraftField) {
    const message = errors[field];
    return message === undefined ? null : (
      <p id={`${id}-${field}-error`} className="text-fail text-xs">
        {message}
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${id}-title`}
      noValidate
      className="border-line bg-surface space-y-3 rounded-2xl border p-4 shadow-sm"
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="space-y-1">
        <label htmlFor={`${id}-name`} className="text-soft block text-sm">
          Name
        </label>
        <input
          {...fieldProps('name')}
          value={draft.name}
          maxLength={LIBRARY_LIMITS.nameLength}
          onChange={(event) => {
            change({ name: event.target.value });
          }}
          className={INPUT}
        />
        {fieldError('name')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={`${id}-type`} className="text-soft block text-sm">
            Type
          </label>
          <select
            id={`${id}-type`}
            value={draft.type}
            onChange={(event) => {
              const type = TERRAIN_TYPES.find((option) => option === event.target.value);
              if (type !== undefined) {
                change({ type });
              }
            }}
            className={INPUT}
          >
            {TERRAIN_TYPES.map((type: TerrainType) => (
              <option key={type} value={type}>
                {TERRAIN_STYLES[type].name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-1">
          <legend className="text-soft text-sm">Shape</legend>
          <div className="flex gap-3 pt-1.5 text-sm">
            {(['rect', 'ellipse'] as const).map((shape) => (
              <label key={shape} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`${id}-shape`}
                  checked={draft.shape === shape}
                  onChange={() => {
                    change({ shape });
                  }}
                  className="accent-amber-500"
                />
                {shape === 'rect' ? 'Rectangle' : 'Oval'}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor={`${id}-width`} className="text-soft block text-sm">
            Width ({unitName})
          </label>
          <input
            {...fieldProps('width')}
            inputMode="decimal"
            value={draft.width}
            onChange={(event) => {
              change({ width: event.target.value });
            }}
            className={INPUT}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-depth`} className="text-soft block text-sm">
            Depth ({unitName})
          </label>
          <input
            {...fieldProps('depth')}
            inputMode="decimal"
            value={draft.depth}
            onChange={(event) => {
              change({ depth: event.target.value });
            }}
            className={INPUT}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-quantity`} className="text-soft block text-sm">
            How many
          </label>
          <input
            {...fieldProps('quantity')}
            inputMode="numeric"
            value={draft.quantity}
            onChange={(event) => {
              change({ quantity: event.target.value });
            }}
            className={INPUT}
          />
        </div>
      </div>
      {fieldError('width')}
      {fieldError('depth')}
      {fieldError('quantity')}
      <FootprintPreview type={draft.type} footprint={draftFootprint(draft, unit)} unit={unit} />
      <div aria-live="polite">
        {errors.library !== undefined && (
          <p role="alert" className="text-fail text-sm">
            {errors.library}
          </p>
        )}
        {error !== null && (
          <p role="alert" className="text-fail text-sm">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="border-line-strong hover:bg-hover rounded-lg border px-3 py-1.5 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-accent text-on-accent hover:bg-accent-hover rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save piece'}
        </button>
      </div>
    </form>
  );
}
