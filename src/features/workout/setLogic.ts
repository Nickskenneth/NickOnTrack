import type { SessionSet } from '../../db/types'
import { formatWeight, type Units } from '../../lib/units'

export type Completion = { ok: true; weight?: number; reps: number } | { ok: false }

/**
 * Values to store when a set is checked. Empty fields fall back to the previous
 * session's placeholder. Reps (or seconds) are required; weight may stay empty
 * for bodyweight work.
 */
export function resolveCompletion(set: SessionSet, placeholder?: SessionSet): Completion {
  const reps = set.reps ?? placeholder?.reps
  if (reps === undefined) return { ok: false }
  return { ok: true, reps, weight: set.weight ?? placeholder?.weight }
}

/** "40kg × 8", "12 reps", "35s" for the Previous column. */
export function previousLabel(prev: SessionSet | undefined, units: Units, isTimed?: boolean): string {
  if (!prev || prev.reps === undefined) return '–'
  if (isTimed) return `${prev.reps}s`
  return prev.weight ? `${formatWeight(prev.weight, units)}${units} × ${prev.reps}` : `${prev.reps} reps`
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}
