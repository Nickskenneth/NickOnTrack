import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/db'
import { getSettings } from '../../db/queries'
import type { Template, TemplateExercise } from '../../db/types'
import ExercisePicker from '../exercises/ExercisePicker'
import {
  addRow,
  blankTemplate,
  linkWithNext,
  moveRow,
  removeRow,
  replaceExercise,
  unlinkFromNext,
  updateRow,
  validateTemplate,
} from './editorLogic'

type PickerState = { mode: 'add' } | { mode: 'replace'; index: number } | null

const field =
  'w-full rounded-lg bg-neutral-800 px-3 py-3 text-base text-neutral-100 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-emerald-500'

function NumField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
      {label}
      <input
        className={field}
        inputMode="numeric"
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '')
          onChange(digits === '' ? NaN : Math.max(min, Number(digits)))
        }}
      />
    </label>
  )
}

export default function TemplateEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const [draft, setDraft] = useState<Template | null>(isNew ? blankTemplate() : null)
  const [picker, setPicker] = useState<PickerState>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const names = useMemo(() => new Map(exercises?.map((e) => [e.id, e.name])), [exercises])

  useEffect(() => {
    if (isNew || !id) return
    let cancelled = false
    db.templates.get(id).then((t) => {
      if (cancelled) return
      if (t) setDraft(structuredClone(t))
      else setNotFound(true)
    })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  if (notFound) return <p className="p-4 text-neutral-400">Template not found.</p>
  if (!draft) return null

  const setRows = (exercises: TemplateExercise[]) => setDraft({ ...draft, exercises })
  const rows = draft.exercises

  async function save() {
    if (!draft) return
    const problem = validateTemplate(draft)
    if (problem) return setError(problem)
    await db.templates.put({ ...draft, name: draft.name.trim(), updatedAt: Date.now() })
    navigate('/')
  }

  async function handlePick(exerciseId: string) {
    if (picker?.mode === 'replace') setRows(replaceExercise(rows, picker.index, exerciseId))
    else setRows(addRow(rows, exerciseId, (await getSettings()).defaultRestSeconds))
    setPicker(null)
  }

  const btn = 'min-h-11 min-w-11 rounded-lg bg-neutral-800 px-3 text-sm font-medium active:bg-neutral-700 disabled:opacity-30'

  return (
    <div className="p-4 pb-28">
      <h1 className="mb-4 text-2xl font-bold">{isNew ? 'New template' : 'Edit template'}</h1>

      <div className="flex flex-col gap-3">
        <input
          className={field}
          placeholder="Template name (e.g. Full Body Day 1)"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <textarea
          className={`${field} min-h-20`}
          placeholder="Notes: warm-up, finisher, reminders (optional)"
          value={draft.note ?? ''}
          onChange={(e) => setDraft({ ...draft, note: e.target.value || undefined })}
        />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Exercises
      </h2>

      <ul className="flex flex-col">
        {rows.map((r, i) => {
          const inGroup = !!r.supersetGroup
          const groupStart = inGroup && rows[i - 1]?.supersetGroup !== r.supersetGroup
          const groupEnd = inGroup && rows[i + 1]?.supersetGroup !== r.supersetGroup
          const position = inGroup
            ? rows.slice(0, i + 1).filter((x) => x.supersetGroup === r.supersetGroup).length
            : 0
          const nextLinked = !groupEnd && inGroup
          return (
            <li key={`${i}-${r.exerciseId}`} className={groupStart || !inGroup ? 'mt-3' : 'mt-0.5'}>
              <div
                className={`rounded-xl bg-neutral-900 p-3 ${
                  inGroup ? 'border-l-4 border-emerald-500' : ''
                } ${groupStart ? 'rounded-b-none' : ''} ${
                  inGroup && !groupStart && !groupEnd ? 'rounded-none' : ''
                } ${groupEnd && !groupStart ? 'rounded-t-none' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="min-h-11 flex-1 text-left"
                    onClick={() => setPicker({ mode: 'replace', index: i })}
                  >
                    {inGroup && (
                      <span className="mr-2 rounded bg-emerald-500 px-1.5 py-0.5 text-xs font-bold text-black">
                        {r.supersetGroup}
                        {position}
                      </span>
                    )}
                    <span className="font-semibold">{names.get(r.exerciseId) ?? '…'}</span>
                    <span className="block text-xs text-emerald-400">Tap to replace</span>
                  </button>
                  <div className="flex gap-1">
                    <button className={btn} disabled={i === 0} onClick={() => setRows(moveRow(rows, i, -1))} aria-label="Move up">
                      ↑
                    </button>
                    <button
                      className={btn}
                      disabled={i === rows.length - 1}
                      onClick={() => setRows(moveRow(rows, i, 1))}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button className={`${btn} text-red-400`} onClick={() => setRows(removeRow(rows, i))} aria-label="Remove">
                      ✕
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex gap-2">
                  <NumField label="Sets" min={1} value={r.sets} onChange={(n) => setRows(updateRow(rows, i, { sets: n }))} />
                  <NumField
                    label={r.isTimed ? 'Min sec' : 'Min reps'}
                    min={1}
                    value={r.repMin}
                    onChange={(n) => setRows(updateRow(rows, i, { repMin: n }))}
                  />
                  <NumField
                    label={r.isTimed ? 'Max sec' : 'Max reps'}
                    min={1}
                    value={r.repMax}
                    onChange={(n) => setRows(updateRow(rows, i, { repMax: n }))}
                  />
                  {!nextLinked && (
                    <NumField
                      label={inGroup ? 'Rest after pair (s)' : 'Rest (s)'}
                      value={r.restSeconds}
                      onChange={(n) => setRows(updateRow(rows, i, { restSeconds: n }))}
                    />
                  )}
                </div>
                {nextLinked && (
                  <p className="mt-1 text-xs text-neutral-500">
                    No rest here. Rest runs after the last exercise of the superset.
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-4 text-sm text-neutral-300">
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-5 accent-emerald-500"
                      checked={!!r.isTimed}
                      onChange={(e) => setRows(updateRow(rows, i, { isTimed: e.target.checked || undefined }))}
                    />
                    Timed (seconds)
                  </label>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-5 accent-emerald-500"
                      checked={!!r.perSide}
                      onChange={(e) => setRows(updateRow(rows, i, { perSide: e.target.checked || undefined }))}
                    />
                    Per side
                  </label>
                </div>

                <input
                  className={`${field} mt-1`}
                  placeholder="Note for this slot (optional)"
                  value={r.note ?? ''}
                  onChange={(e) => setRows(updateRow(rows, i, { note: e.target.value || undefined }))}
                />
              </div>

              {i < rows.length - 1 && (
                <div className="flex justify-center py-1">
                  {nextLinked ? (
                    <button className="min-h-9 text-xs text-neutral-500" onClick={() => setRows(unlinkFromNext(rows, i))}>
                      Unlink superset
                    </button>
                  ) : (
                    <button className="min-h-9 text-xs text-emerald-400" onClick={() => setRows(linkWithNext(rows, i))}>
                      Superset with next
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <button
        className="mt-4 min-h-12 w-full rounded-xl bg-neutral-800 font-semibold"
        onClick={() => setPicker({ mode: 'add' })}
      >
        + Add exercise
      </button>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 flex gap-3 border-t border-neutral-800 bg-neutral-950 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button className="min-h-12 flex-1 rounded-xl bg-neutral-800 font-medium" onClick={() => navigate('/')}>
          Cancel
        </button>
        <button className="min-h-12 flex-[2] rounded-xl bg-emerald-500 font-semibold text-black" onClick={save}>
          Save template
        </button>
      </div>

      {picker && (
        <ExercisePicker
          title={picker.mode === 'replace' ? 'Replace exercise' : 'Add exercise'}
          onPick={(e) => handlePick(e.id)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
