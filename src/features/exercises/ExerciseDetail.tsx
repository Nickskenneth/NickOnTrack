import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/db'
import { getExerciseHistory, getSettings } from '../../db/queries'
import { formatDate, setsSummary } from '../history/historyLogic'
import ExerciseForm from './ExerciseForm'

export default function ExerciseDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const exercise = useLiveQuery(() => db.exercises.get(id), [id])
  const history = useLiveQuery(() => getExerciseHistory(id), [id])
  const settings = useLiveQuery(() => getSettings(), [])
  const [saved, setSaved] = useState(false)

  if (exercise === undefined || !history || !settings) return null
  if (!exercise) return <p className="p-4 text-neutral-400">Exercise not found.</p>

  async function toggleArchive() {
    await db.exercises.update(id, { archived: exercise!.archived ? undefined : true })
  }

  async function remove() {
    const inSessions = (await db.sessions.toArray()).some((s) => s.exercises.some((e) => e.exerciseId === id))
    const inTemplates = (await db.templates.toArray()).some((t) => t.exercises.some((e) => e.exerciseId === id))
    if (inSessions || inTemplates) {
      window.alert('This exercise is used in a template or in past workouts, so it can only be archived.')
      return
    }
    if (!window.confirm(`Delete "${exercise!.name}" permanently?`)) return
    await db.exercises.delete(id)
    navigate('/exercises', { replace: true })
  }

  return (
    <div className="p-4">
      <Link to="/exercises" className="text-sm text-emerald-400">
        &larr; Exercises
      </Link>
      <h1 className="mb-3 mt-2 text-2xl font-bold">{exercise.name}</h1>
      {exercise.archived && <p className="mb-2 text-sm text-amber-400">Archived: hidden from pickers.</p>}

      <div className="rounded-xl bg-neutral-900 p-3">
        <ExerciseForm
          key={exercise.name + (exercise.note ?? '')}
          initial={exercise}
          submitLabel="Save changes"
          onSubmit={async (e) => {
            await db.exercises.put(e)
            setSaved(true)
            setTimeout(() => setSaved(false), 1500)
          }}
        />
        {saved && <p className="mt-2 text-sm text-emerald-400">Saved.</p>}
      </div>

      <div className="mt-3 flex gap-2">
        <button className="min-h-12 flex-1 rounded-xl bg-neutral-900 font-medium" onClick={toggleArchive}>
          {exercise.archived ? 'Restore' : 'Archive'}
        </button>
        <button className="min-h-12 flex-1 rounded-xl bg-neutral-900 font-medium text-red-400" onClick={remove}>
          Delete
        </button>
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-500">History</h2>
      <ul className="flex flex-col gap-2">
        {history.map(({ session, exercise: ex }) => (
          <li key={session.id}>
            <Link to={`/history/${session.id}`} className="block rounded-xl bg-neutral-900 p-3 active:bg-neutral-800">
              <p className="text-sm text-neutral-500">
                {formatDate(session.startedAt)} · {session.name}
              </p>
              <p className="mt-1 text-sm">{setsSummary(ex, settings.units)}</p>
            </Link>
          </li>
        ))}
        {history.length === 0 && <li className="text-neutral-500">Not logged in any finished workout yet.</li>}
      </ul>
    </div>
  )
}
