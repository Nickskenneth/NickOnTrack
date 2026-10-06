import { db as defaultDb, type NickOnTrackDB } from '../db/db'
import type { SessionExercise } from '../db/types'

// Timestamp-based: only the end time is stored, so the remaining time is always
// derived from the clock and stays correct after backgrounding, locking or a reload.
// Persisted in the meta table; a single key means only one timer can exist.

export interface RestTimer {
  endsAt: number
  duration: number // seconds, including +/- adjustments (for the progress bar)
}

const KEY = 'restTimer'

export async function getRest(db: NickOnTrackDB = defaultDb): Promise<RestTimer | undefined> {
  return (await db.meta.get(KEY))?.value as RestTimer | undefined
}

/** Starts a timer, replacing any running one. */
export async function startRest(
  seconds: number,
  db: NickOnTrackDB = defaultDb,
  now = Date.now(),
): Promise<void> {
  const value: RestTimer = { endsAt: now + seconds * 1000, duration: seconds }
  await db.meta.put({ key: KEY, value })
}

/** Adds/subtracts seconds. Dropping to zero or below ends the timer. */
export async function adjustRest(
  deltaSeconds: number,
  db: NickOnTrackDB = defaultDb,
  now = Date.now(),
): Promise<void> {
  const t = await getRest(db)
  if (!t) return
  const endsAt = t.endsAt + deltaSeconds * 1000
  if (endsAt <= now) return skipRest(db)
  const value: RestTimer = { endsAt, duration: Math.max(1, t.duration + deltaSeconds) }
  await db.meta.put({ key: KEY, value })
}

export async function skipRest(db: NickOnTrackDB = defaultDb): Promise<void> {
  await db.meta.delete(KEY)
}

export const remainingMs = (t: RestTimer, now: number): number => Math.max(0, t.endsAt - now)

/**
 * Rest (seconds) to start after completing set `setIndex` of `ex`, or null for no timer.
 * Supersets: no timer until the LAST exercise of the group that has this set number is
 * done; the pair's rest is stored on the group's last exercise.
 */
export function restAfterSet(
  exercises: SessionExercise[],
  ex: SessionExercise,
  setIndex: number,
  defaultRestSeconds: number,
): number | null {
  if (!ex.supersetGroup) return ex.restSeconds || defaultRestSeconds

  const group = exercises
    .filter((e) => e.supersetGroup === ex.supersetGroup)
    .sort((a, b) => a.order - b.order)
  const withThisSet = group.filter((e) => e.sets.length > setIndex)
  if (withThisSet[withThisSet.length - 1]?.order !== ex.order) return null

  const groupRest = group[group.length - 1].restSeconds
  return ex.restSeconds || groupRest || defaultRestSeconds
}
