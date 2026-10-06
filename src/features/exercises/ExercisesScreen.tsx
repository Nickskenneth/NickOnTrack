import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import { newId } from '../../lib/id'
import ExerciseForm from './ExerciseForm'

export default function ExercisesScreen() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (exercises ?? [])
      .filter((e) => showArchived || !e.archived)
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.muscleGroup?.toLowerCase().includes(q) ||
          e.equipment?.toLowerCase().includes(q),
      )
  }, [exercises, query, showArchived])

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Exercises</h1>

      {creating ? (
        <div className="mb-4 rounded-xl bg-neutral-900 p-3">
          <h2 className="mb-3 font-semibold">New exercise</h2>
          <ExerciseForm
            initial={{ id: newId(), name: '' }}
            submitLabel="Add to library"
            onSubmit={async (e) => {
              await db.exercises.add(e)
              setCreating(false)
            }}
          />
          <button className="mt-2 min-h-11 w-full text-sm text-neutral-400" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          className="mb-4 min-h-12 w-full rounded-xl bg-emerald-500 font-semibold text-black"
          onClick={() => setCreating(true)}
        >
          + New exercise
        </button>
      )}

      <input
        className="w-full rounded-lg bg-neutral-900 px-3 py-3 text-base outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-emerald-500"
        placeholder="Search by name, muscle or equipment"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-neutral-400">
        <input
          type="checkbox"
          className="size-5 accent-emerald-500"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
        Show archived
      </label>

      <ul className="mt-2 flex flex-col">
        {filtered.map((e) => (
          <li key={e.id}>
            <Link
              to={`/exercises/${e.id}`}
              className="flex min-h-14 flex-col justify-center rounded-lg px-2 active:bg-neutral-900"
            >
              <span className="font-medium">
                {e.name}
                {e.archived && <span className="ml-2 text-xs text-neutral-500">(archived)</span>}
              </span>
              <span className="text-sm text-neutral-500">{[e.muscleGroup, e.equipment].filter(Boolean).join(' · ')}</span>
            </Link>
          </li>
        ))}
        {exercises && filtered.length === 0 && <li className="py-6 text-center text-neutral-500">No matches.</li>}
      </ul>
    </div>
  )
}
