import type { Session, SessionExercise } from '../../db/types'
import { formatWeight, toDisplay, type Units } from '../../lib/units'

/** Total weight x reps over completed, non-timed sets, in kg. */
export function sessionVolumeKg(session: Session): number {
  let total = 0
  for (const ex of session.exercises) {
    if (ex.isTimed) continue
    for (const s of ex.sets) {
      if (s.completed && s.weight && s.reps) total += s.weight * s.reps
    }
  }
  return total
}

export function formatVolume(kg: number, units: Units): string {
  return `${Math.round(toDisplay(kg, units)).toLocaleString()} ${units}`
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

/** "100kg × 6, 100kg × 5" for the completed sets of one exercise. */
export function setsSummary(ex: SessionExercise, units: Units): string {
  const done = ex.sets.filter((s) => s.completed && s.reps !== undefined)
  if (done.length === 0) return 'No completed sets'
  return done
    .map((s) =>
      ex.isTimed
        ? `${s.reps}s`
        : s.weight
          ? `${formatWeight(s.weight, units)}${units} × ${s.reps}`
          : `${s.reps} reps`,
    )
    .join(', ')
}
