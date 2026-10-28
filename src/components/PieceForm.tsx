import { XIcon } from 'lucide-react';
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
import { BUTTON_STYLES } from './buttonStyles';
import { FIELD_STYLES, LABEL_STYLES } from './fieldStyles';
import { FootprintPreview } from './FootprintPreview';
import { IconButton } from './IconButton';
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
      <p id={`${id}-${field}-error`} className="text-fail mt-1 text-xs">
        {message}
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${id}-title`}
      noValidate
      className="flex h-full flex-col"
    >
      <div className="border-line flex shrink-0 items-center justify-between gap-2 border-b py-3 pr-3 pl-5">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        <IconButton icon={XIcon} label="Close" onClick={onCancel} disabled={saving} />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="space-y-1">
          <label htmlFor={`${id}-name`} className={LABEL_STYLES}>
            Name
          </label>
          <input
            {...fieldProps('name')}
            value={draft.name}
            maxLength={LIBRARY_LIMITS.nameLength}
            onChange={(event) => {
              change({ name: event.target.value });
            }}
            className={FIELD_STYLES}
          />
          {fieldError('name')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor={`${id}-type`} className={LABEL_STYLES}>
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
              className={FIELD_STYLES}
            >
              {TERRAIN_TYPES.map((type: TerrainType) => (
                <option key={type} value={type}>
                  {TERRAIN_STYLES[type].name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-1">
            <legend className={LABEL_STYLES}>Shape</legend>
            <div className="flex h-10 items-center gap-4 text-sm pointer-coarse:h-11">
              {(['rect', 'ellipse'] as const).map((shape) => (
                <label key={shape} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name={`${id}-shape`}
                    checked={draft.shape === shape}
                    onChange={() => {
                      change({ shape });
                    }}
                    className="accent-accent size-4"
                  />
                  {shape === 'rect' ? 'Rectangle' : 'Oval'}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor={`${id}-width`} className={LABEL_STYLES}>
              Width ({unitName})
            </label>
            <input
              {...fieldProps('width')}
              inputMode="decimal"
              value={draft.width}
              onChange={(event) => {
                change({ width: event.target.value });
              }}
              className={FIELD_STYLES}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-depth`} className={LABEL_STYLES}>
              Depth ({unitName})
            </label>
            <input
              {...fieldProps('depth')}
              inputMode="decimal"
              value={draft.depth}
              onChange={(event) => {
                change({ depth: event.target.value });
              }}
              className={FIELD_STYLES}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-quantity`} className={LABEL_STYLES}>
              How many
            </label>
            <input
              {...fieldProps('quantity')}
              inputMode="numeric"
              value={draft.quantity}
              onChange={(event) => {
                change({ quantity: event.target.value });
              }}
              className={FIELD_STYLES}
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
      </div>
      <div className="border-line flex shrink-0 gap-2 border-t px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={BUTTON_STYLES.secondary}
        >
          Cancel
        </button>
        <button type="submit" disabled={saving} className={`flex-1 ${BUTTON_STYLES.primary}`}>
          {saving ? 'Saving…' : 'Save piece'}
        </button>
      </div>
    </form>
  );
}
