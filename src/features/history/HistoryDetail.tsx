import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/db'
import { discardSession, getSettings, updateSession } from '../../db/queries'
import SetRow from '../workout/SetRow'
import { formatDate, formatDuration, formatVolume, sessionVolumeKg } from './historyLogic'

export default function HistoryDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const session = useLiveQuery(() => db.sessions.get(id), [id])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const settings = useLiveQuery(() => getSettings(), [])
  const byId = useMemo(() => new Map(exercises?.map((e) => [e.id, e])), [exercises])

  if (session === undefined || !settings || !exercises) return null
  if (!session) return <p className="p-4 text-neutral-400">Workout not found.</p>

  async function remove() {
    if (!window.confirm('Delete this workout from history? This cannot be undone.')) return
    await discardSession(id)
    navigate('/history', { replace: true })
  }

  const units = settings.units
  const sorted = [...session.exercises].sort((a, b) => a.order - b.order)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <Link to="/history" className="flex min-h-11 items-center text-sm text-emerald-400">
          &larr; History
        </Link>
        <button className="min-h-11 rounded-lg px-3 text-sm font-medium text-red-400" onClick={remove}>
          Delete workout
        </button>
      </div>

      <input
        className="mt-2 w-full rounded-lg bg-neutral-900 px-3 py-3 text-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"
        value={session.name}
        onChange={(e) => updateSession(id, { name: e.target.value })}
        aria-label="Workout name"
      />
      <p className="mt-2 text-sm text-neutral-500">
        {formatDate(session.startedAt)}
        {session.finishedAt && ` · ${formatDuration(session.finishedAt - session.startedAt)}`}
        {` · ${formatVolume(sessionVolumeKg(session), units)}`}
      </p>
      {!session.finishedAt && (
        <Link to={`/workout/${session.id}`} className="mt-2 inline-block text-sm text-emerald-400">
          This workout is still in progress. Open it.
        </Link>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {sorted.map((ex) => {
          const exercise = byId.get(ex.exerciseId)
          return (
            <section key={ex.order} className="rounded-xl border border-neutral-700 bg-neutral-800 p-3">
              <Link to={`/exercises/${ex.exerciseId}`} className="text-lg font-semibold">
                {exercise?.name ?? 'Deleted exercise'}
              </Link>
              {ex.supersetGroup && <span className="ml-2 text-xs text-emerald-400">Superset {ex.supersetGroup}</span>}
              {ex.swappedFromExerciseId && (
                <p className="text-xs text-amber-400">
                  Swapped (was {byId.get(ex.swappedFromExerciseId)?.name ?? 'another exercise'})
                </p>
              )}
              <div className="mt-2 grid grid-cols-[1.75rem_1fr_4.25rem_4.25rem_3rem] gap-2 px-1 text-xs uppercase tracking-wide text-neutral-400">
                <span className="text-center">Set</span>
                <span />
                <span className="text-center">{units}</span>
                <span className="text-center">{ex.isTimed ? 'Sec' : 'Reps'}</span>
                <span />
              </div>
              <div className="flex flex-col gap-1">
                {ex.sets.map((s) => (
                  <SetRow
                    key={s.index}
                    sessionId={session.id}
                    order={ex.order}
                    set={s}
                    units={units}
                    isTimed={ex.isTimed}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <textarea
        className="mt-4 min-h-20 w-full rounded-lg bg-neutral-900 px-3 py-3 text-base outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-emerald-500"
        placeholder="Workout note (optional)"
        value={session.note ?? ''}
        onChange={(e) => updateSession(id, { note: e.target.value || undefined })}
      />

      <button className="mt-3 min-h-12 w-full rounded-xl bg-neutral-900 font-medium text-red-400" onClick={remove}>
        Delete workout
      </button>
    </div>
  )
}
