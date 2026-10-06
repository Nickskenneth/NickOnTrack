import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../../db/db'
import type { Exercise } from '../../db/types'
import { newId } from '../../lib/id'

interface Props {
  title?: string
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

/** Bottom-sheet exercise chooser with search and inline "new exercise". Reused by templates and workouts. */
export default function ExercisePicker({ title = 'Choose exercise', onPick, onClose }: Props) {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', muscleGroup: '', equipment: '' })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (exercises ?? [])
      .filter((e) => !e.archived)
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.muscleGroup?.toLowerCase().includes(q) ||
          e.equipment?.toLowerCase().includes(q),
      )
  }, [exercises, query])

  async function createExercise() {
    const name = draft.name.trim()
    if (!name) return
    const exercise: Exercise = {
      id: newId(),
      name,
      muscleGroup: draft.muscleGroup.trim() || undefined,
      equipment: draft.equipment.trim() || undefined,
    }
    await db.exercises.add(exercise)
    onPick(exercise)
  }

  const input =
    'w-full rounded-lg bg-neutral-800 px-3 py-3 text-base text-neutral-100 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={onClose}>
      <div
        className="flex max-h-[85vh] flex-col rounded-t-2xl bg-neutral-900 pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-lg font-semibold">{creating ? 'New exercise' : title}</h2>
          <button className="min-h-11 px-2 text-neutral-400" onClick={onClose}>
            Cancel
          </button>
        </div>

        {creating ? (
          <div className="flex flex-col gap-3 p-4">
            <input
              className={input}
              placeholder="Name (e.g. Cable crunch)"
              value={draft.name}
              autoFocus
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <input
              className={input}
              placeholder="Muscle group (optional)"
              value={draft.muscleGroup}
              onChange={(e) => setDraft({ ...draft, muscleGroup: e.target.value })}
            />
            <input
              className={input}
              placeholder="Equipment (optional)"
              value={draft.equipment}
              onChange={(e) => setDraft({ ...draft, equipment: e.target.value })}
            />
            <div className="flex gap-3">
              <button
                className="min-h-12 flex-1 rounded-lg bg-neutral-800 font-medium"
                onClick={() => setCreating(false)}
              >
                Back
              </button>
              <button
                className="min-h-12 flex-1 rounded-lg bg-emerald-500 font-semibold text-black disabled:opacity-40"
                disabled={!draft.name.trim()}
                onClick={createExercise}
              >
                Create &amp; use
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4">
              <input
                className={input}
                placeholder="Search exercises"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <ul className="flex-1 overflow-y-auto px-2">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    className="flex min-h-14 w-full flex-col justify-center rounded-lg px-3 text-left active:bg-neutral-800"
                    onClick={() => onPick(e)}
                  >
                    <span className="font-medium">{e.name}</span>
                    <span className="text-sm text-neutral-500">
                      {[e.muscleGroup, e.equipment].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
              {exercises && filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-neutral-500">No matches.</li>
              )}
            </ul>
            <div className="p-4">
              <button
                className="min-h-12 w-full rounded-lg bg-emerald-500 font-semibold text-black"
                onClick={() => {
                  setDraft({ name: query.trim(), muscleGroup: '', equipment: '' })
                  setCreating(true)
                }}
              >
                + New exercise
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
