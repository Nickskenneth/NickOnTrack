import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/db'
import {
  discardSession,
  finishSession,
  getPreviousSets,
  getSettings,
  placeholderFor,
  updateSession,
} from '../../db/queries'
import { restAfterSet, skipRest, startRest } from '../../lib/restTimer'
import { useWakeLock } from '../../lib/wakeLock'
import type { SessionExercise, SessionSet } from '../../db/types'
import ExerciseCard from './ExerciseCard'
import RestTimerBar from './RestTimerBar'
import { formatElapsed } from './setLogic'

export default function ActiveWorkout() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const session = useLiveQuery(() => db.sessions.get(id), [id])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const settings = useLiveQuery(() => getSettings(), [])
  const names = useMemo(() => new Map(exercises?.map((e) => [e.id, e])), [exercises])

  // Previous values; re-fetched when the exercise lineup changes (e.g. after a swap).
  const idsKey = session?.exercises.map((e) => e.exerciseId).join(',') ?? ''
  const previous = useLiveQuery(
    () => getPreviousSets(idsKey ? idsKey.split(',') : [], id),
    [idsKey, id],
  )

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useWakeLock(true) // keep the screen on while a workout is open (best-effort)

  if (session === undefined || !settings || !exercises) return null
  if (!session) return <p className="p-4 text-neutral-400">Workout not found.</p>
  if (session.finishedAt) {
    return (
      <div className="p-4">
        <p className="text-neutral-400">This workout is already finished.</p>
        <Link to="/" className="mt-3 inline-block text-emerald-400">Back to Workout</Link>
      </div>
    )
  }

  const units = settings.units
  const sorted = [...session.exercises].sort((a, b) => a.order - b.order)
  const total = sorted.reduce((n, e) => n + e.sets.length, 0)
  const done = sorted.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)

  function handleSetCompleted(ex: SessionExercise, set: SessionSet) {
    const seconds = restAfterSet(sorted, ex, set.index, settings!.defaultRestSeconds)
    if (seconds !== null) void startRest(seconds)
  }

  async function finish() {
    const remaining = total - done
    const msg = remaining
      ? `${remaining} set${remaining === 1 ? ' is' : 's are'} not completed. Finish anyway?`
      : 'Finish this workout?'
    if (!window.confirm(msg)) return
    await finishSession(id)
    await skipRest()
    navigate('/')
  }

  async function discard() {
    if (!window.confirm('Discard this workout? Everything logged in it will be deleted.')) return
    await discardSession(id)
    await skipRest()
    navigate('/')
  }

  return (
    <div className="p-4 pb-60">
      <div className="mb-3 flex items-center justify-between text-sm text-neutral-500">
        <span>{formatElapsed(now - session.startedAt)}</span>
        <span>
          {done}/{total} sets
        </span>
      </div>

      <input
        className="w-full rounded-lg bg-neutral-900 px-3 py-3 text-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"
        value={session.name}
        onChange={(e) => updateSession(id, { name: e.target.value })}
        aria-label="Workout name"
      />

      <div className="mt-4 flex flex-col">
        {sorted.map((ex, i) => {
          const prevInGroup = !!ex.supersetGroup && sorted[i - 1]?.supersetGroup === ex.supersetGroup
          const nextInGroup = !!ex.supersetGroup && sorted[i + 1]?.supersetGroup === ex.supersetGroup
          const groupPosition = !ex.supersetGroup
            ? 'none'
            : prevInGroup && nextInGroup
              ? 'middle'
              : prevInGroup
                ? 'end'
                : nextInGroup
                  ? 'start'
                  : 'none'
          const position = ex.supersetGroup
            ? sorted.slice(0, i + 1).filter((x) => x.supersetGroup === ex.supersetGroup).length
            : 0
          const original = ex.swappedFromExerciseId ? names.get(ex.swappedFromExerciseId)?.name : undefined
          return (
            <div key={ex.order} className={groupPosition === 'start' || groupPosition === 'none' ? 'mt-3 first:mt-0' : 'mt-0.5'}>
              <ExerciseCard
                sessionId={id}
                ex={ex}
                exercise={names.get(ex.exerciseId)}
                originalName={original}
                previous={previous?.[ex.exerciseId]}
                placeholderFor={placeholderFor}
                units={units}
                groupPosition={groupPosition}
                groupLabel={groupPosition === 'none' ? undefined : `${ex.supersetGroup}${position}`}
                onSetCompleted={handleSetCompleted}
              />
            </div>
          )
        })}
      </div>

      <textarea
        className="mt-4 min-h-20 w-full rounded-lg bg-neutral-900 px-3 py-3 text-base outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-emerald-500"
        placeholder="Workout note (optional)"
        value={session.note ?? ''}
        onChange={(e) => updateSession(id, { note: e.target.value || undefined })}
      />

      <button className="mt-3 min-h-11 w-full rounded-lg text-sm text-red-400" onClick={discard}>
        Discard workout
      </button>

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-neutral-950">
        <RestTimerBar soundOn={settings.soundOn} />
        <div className="flex gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link to="/" className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-neutral-800 font-medium">
            Leave
          </Link>
          <button className="min-h-12 flex-[2] rounded-xl bg-emerald-500 font-semibold text-black" onClick={finish}>
            Finish workout
          </button>
        </div>
      </div>
    </div>
  )
}
