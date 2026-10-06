import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { NickOnTrackDB } from './db'
import {
  getActiveSession,
  getExerciseHistory,
  getPreviousSets,
  placeholderFor,
  startSessionFromTemplate,
  suggestSessionName,
  swapSessionExercise,
} from './queries'
import { seedIfNeeded } from './seed'

let db: NickOnTrackDB
beforeEach(async () => {
  db = new NickOnTrackDB(`test-${Math.random()}`)
  await seedIfNeeded(db)
})

const finish = async (id: string, sets: [number, number][], at: number) => {
  const s = (await db.sessions.get(id))!
  s.exercises[0].sets = sets.map(([weight, reps], index) => ({ index, weight, reps, completed: true }))
  s.startedAt = at
  s.finishedAt = at + 1000
  await db.sessions.put(s)
}

describe('seed', () => {
  it('loads the plan once and is idempotent', async () => {
    expect(await db.templates.count()).toBe(4)
    expect(await seedIfNeeded(db)).toBe(false)
    expect(await db.templates.count()).toBe(4)
    expect(await db.exercises.count()).toBeGreaterThan(25)
  })

  it('does not re-seed after the user deletes a template', async () => {
    const t = (await db.templates.toArray())[0]
    await db.templates.delete(t.id)
    await seedIfNeeded(db)
    expect(await db.templates.count()).toBe(3)
  })

  it('every template exercise points at a real exercise', async () => {
    const ids = new Set((await db.exercises.toArray()).map((e) => e.id))
    for (const t of await db.templates.toArray())
      for (const e of t.exercises) expect(ids.has(e.exerciseId)).toBe(true)
  })
})

describe('sessions', () => {
  it('auto-names by finished count and resumes the active session', async () => {
    const t = (await db.templates.toArray())[0]
    const s1 = await startSessionFromTemplate(t.id, db)
    expect(s1.name).toBe(`${t.name} - Week 1`)
    expect((await startSessionFromTemplate(t.id, db)).id).toBe(s1.id)
    expect((await getActiveSession(db))?.id).toBe(s1.id)
    await finish(s1.id, [[100, 6]], 1000)
    expect(await suggestSessionName(t.id, db)).toBe(`${t.name} - Week 2`)
  })

  it('previous sets come from the latest finished session, any template', async () => {
    const [t1, t2] = await db.templates.toArray()
    const a = await startSessionFromTemplate(t1.id, db)
    await finish(a.id, [[60, 8], [60, 7]], 1000)
    const b = await startSessionFromTemplate(t2.id, db)
    const exId = a.exercises[0].exerciseId
    const prev = await getPreviousSets([exId], b.id, db)
    expect(prev[exId].map((s) => s.weight)).toEqual([60, 60])
    expect(placeholderFor(prev[exId], 1)?.reps).toBe(7)
    expect(placeholderFor(prev[exId], 5)?.reps).toBe(7) // falls back to last set
    expect((await getExerciseHistory(exId, db)).length).toBe(1)
  })

  it('swap changes the session only, not the template', async () => {
    const t = (await db.templates.toArray())[0]
    const s = await startSessionFromTemplate(t.id, db)
    const goblet = (await db.exercises.where('name').equals('Goblet squat').first())!
    await swapSessionExercise(s.id, 0, goblet.id, db)
    const after = (await db.sessions.get(s.id))!
    expect(after.exercises[0].exerciseId).toBe(goblet.id)
    expect(after.exercises[0].swappedFromExerciseId).toBe(t.exercises[0].exerciseId)
    expect((await db.templates.get(t.id))!.exercises[0].exerciseId).toBe(t.exercises[0].exerciseId)
  })
})
