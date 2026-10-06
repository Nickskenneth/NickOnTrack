import { newId } from '../lib/id'
import { autoName } from '../lib/naming'
import { db as defaultDb, DEFAULT_SETTINGS, type NickOnTrackDB } from './db'
import type { Session, SessionExercise, SessionSet, Settings } from './types'

export async function getSettings(db: NickOnTrackDB = defaultDb): Promise<Settings> {
  return (await db.settings.get('settings')) ?? DEFAULT_SETTINGS
}

/** The unfinished session, if any (resume on app open). */
export async function getActiveSession(db: NickOnTrackDB = defaultDb): Promise<Session | undefined> {
  return db.sessions.filter((s) => s.finishedAt == null).first()
}

/** Finished sessions started from this template. */
export async function countFinishedFromTemplate(
  templateId: string,
  db: NickOnTrackDB = defaultDb,
): Promise<number> {
  return db.sessions
    .where('templateId')
    .equals(templateId)
    .filter((s) => s.finishedAt != null)
    .count()
}

export async function suggestSessionName(
  templateId: string,
  db: NickOnTrackDB = defaultDb,
): Promise<string> {
  const template = await db.templates.get(templateId)
  if (!template) throw new Error('Template not found')
  return autoName(template.name, await countFinishedFromTemplate(templateId, db))
}

/**
 * For each exercise, the completed sets from the most recent FINISHED session
 * containing it (any template). Used for placeholders and the "Previous" label.
 */
export async function getPreviousSets(
  exerciseIds: string[],
  excludeSessionId?: string,
  db: NickOnTrackDB = defaultDb,
): Promise<Record<string, SessionSet[]>> {
  const result: Record<string, SessionSet[]> = {}
  const pending = new Set(exerciseIds)
  if (pending.size === 0) return result

  await db.sessions
    .orderBy('startedAt')
    .reverse()
    .until(() => pending.size === 0)
    .each((session) => {
      if (session.finishedAt == null || session.id === excludeSessionId) return
      for (const ex of session.exercises) {
        if (!pending.has(ex.exerciseId)) continue
        const done = ex.sets.filter((s) => s.completed)
        if (done.length === 0) continue
        result[ex.exerciseId] = done
        pending.delete(ex.exerciseId)
      }
    })
  return result
}

/** Placeholder for a set index: same index, else the last set's values. */
export function placeholderFor(
  prev: SessionSet[] | undefined,
  index: number,
): SessionSet | undefined {
  if (!prev?.length) return undefined
  return prev.find((s) => s.index === index) ?? prev[prev.length - 1]
}

export interface ExerciseHistoryEntry {
  session: Session
  exercise: SessionExercise
}

/** All finished sessions containing the exercise, newest first. */
export async function getExerciseHistory(
  exerciseId: string,
  db: NickOnTrackDB = defaultDb,
): Promise<ExerciseHistoryEntry[]> {
  const out: ExerciseHistoryEntry[] = []
  await db.sessions
    .orderBy('startedAt')
    .reverse()
    .each((session) => {
      if (session.finishedAt == null) return
      const exercise = session.exercises.find((e) => e.exerciseId === exerciseId)
      if (exercise) out.push({ session, exercise })
    })
  return out
}

/** Finished sessions, newest first. */
export async function listFinishedSessions(db: NickOnTrackDB = defaultDb): Promise<Session[]> {
  return db.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((s) => s.finishedAt != null)
    .toArray()
}

/** Creates and saves a session from a template. Returns the existing one if a workout is already active. */
export async function startSessionFromTemplate(
  templateId: string,
  db: NickOnTrackDB = defaultDb,
): Promise<Session> {
  const active = await getActiveSession(db)
  if (active) return active

  const template = await db.templates.get(templateId)
  if (!template) throw new Error('Template not found')

  const session: Session = {
    id: newId(),
    templateId,
    name: await suggestSessionName(templateId, db),
    startedAt: Date.now(),
    exercises: [...template.exercises]
      .sort((a, b) => a.order - b.order)
      .map((te, order) => ({
        exerciseId: te.exerciseId,
        order,
        restSeconds: te.restSeconds,
        supersetGroup: te.supersetGroup,
        repMin: te.repMin,
        repMax: te.repMax,
        isTimed: te.isTimed,
        perSide: te.perSide,
        note: te.note,
        sets: Array.from({ length: te.sets }, (_, index) => ({ index, completed: false })),
      })),
  }
  await db.sessions.add(session)
  return session
}

/** Swap an exercise for this session only; the template is untouched. */
export async function swapSessionExercise(
  sessionId: string,
  order: number,
  newExerciseId: string,
  db: NickOnTrackDB = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    const ex = session?.exercises.find((e) => e.order === order)
    if (!session || !ex) throw new Error('Session exercise not found')
    ex.swappedFromExerciseId ??= ex.exerciseId
    ex.exerciseId = newExerciseId
    // Logged sets belonged to the old exercise's loads, so clear them.
    ex.sets = ex.sets.map((s) => ({ index: s.index, completed: false }))
    await db.sessions.put(session)
  })
}

/** Persist a change to one set immediately. */
export async function updateSessionSet(
  sessionId: string,
  order: number,
  index: number,
  patch: Partial<SessionSet>,
  db: NickOnTrackDB = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    const set = session?.exercises.find((e) => e.order === order)?.sets.find((s) => s.index === index)
    if (!session || !set) return
    Object.assign(set, patch)
    await db.sessions.put(session)
  })
}

export async function addSessionSet(
  sessionId: string,
  order: number,
  db: NickOnTrackDB = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    const ex = session?.exercises.find((e) => e.order === order)
    if (!session || !ex) return
    ex.sets.push({ index: ex.sets.length, completed: false })
    await db.sessions.put(session)
  })
}

/** Removes the last set (only if more than one remains). */
export async function removeLastSessionSet(
  sessionId: string,
  order: number,
  db: NickOnTrackDB = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    const ex = session?.exercises.find((e) => e.order === order)
    if (!session || !ex || ex.sets.length <= 1) return
    ex.sets.pop()
    await db.sessions.put(session)
  })
}

export async function updateSession(
  sessionId: string,
  patch: Partial<Pick<Session, 'name' | 'note'>>,
  db: NickOnTrackDB = defaultDb,
): Promise<void> {
  await db.sessions.update(sessionId, patch)
}

export async function finishSession(sessionId: string, db: NickOnTrackDB = defaultDb): Promise<void> {
  await db.sessions.update(sessionId, { finishedAt: Date.now() })
}

export async function discardSession(sessionId: string, db: NickOnTrackDB = defaultDb): Promise<void> {
  await db.sessions.delete(sessionId)
}
