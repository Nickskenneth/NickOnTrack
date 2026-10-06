import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { NickOnTrackDB } from '../db/db'
import { startSessionFromTemplate } from '../db/queries'
import { seedIfNeeded } from '../db/seed'
import { backupFilename, backupStatus, createBackup, mergeBackup, parseBackup, replaceWithBackup } from './backup'

let db: NickOnTrackDB
beforeEach(async () => {
  db = new NickOnTrackDB(`b-${Math.random()}`)
  await seedIfNeeded(db)
})

async function logOneWorkout(d: NickOnTrackDB) {
  const t = (await d.templates.toArray())[0]
  const s = await startSessionFromTemplate(t.id, d)
  s.exercises[0].sets[0] = { index: 0, weight: 80, reps: 5, completed: true }
  s.finishedAt = Date.now()
  await d.sessions.put(s)
  return s
}

describe('export / import', () => {
  it('export, clear, import restores everything', async () => {
    const session = await logOneWorkout(db)
    await db.settings.update('settings', { units: 'lb' })
    const text = JSON.stringify(await createBackup(db))

    await Promise.all([db.exercises.clear(), db.templates.clear(), db.sessions.clear(), db.settings.clear(), db.meta.clear()])
    const parsed = parseBackup(text)
    if (!parsed.ok) throw new Error(parsed.error)
    await replaceWithBackup(db, parsed.backup)

    expect(await db.templates.count()).toBe(4)
    expect(await db.exercises.count()).toBeGreaterThan(25)
    expect((await db.sessions.get(session.id))?.exercises[0].sets[0].weight).toBe(80)
    expect((await db.settings.get('settings'))?.units).toBe('lb')
    // seeding must not run again over restored data
    expect(await seedIfNeeded(db)).toBe(false)
    expect(await db.templates.count()).toBe(4)
  })

  it('rejects bad files', () => {
    expect(parseBackup('nope').ok).toBe(false)
    expect(parseBackup('{"app":"Other"}').ok).toBe(false)
    expect(parseBackup(JSON.stringify({ app: 'NickOnTrack', version: 99, data: {} })).ok).toBe(false)
    expect(parseBackup(JSON.stringify({ app: 'NickOnTrack', version: 1, data: { exercises: [], templates: [] } })).ok).toBe(false)
    expect(
      parseBackup(JSON.stringify({ app: 'NickOnTrack', version: 1, data: { exercises: [{ id: 'x' }], templates: [], sessions: [] } })).ok,
    ).toBe(false)
  })
})

describe('merge', () => {
  it('adds missing workouts and reuses same-named exercises from another install', async () => {
    // a second "install": seeded separately, so exercise ids differ
    const other = new NickOnTrackDB(`o-${Math.random()}`)
    await seedIfNeeded(other)
    const session = await logOneWorkout(other)
    const custom = { id: 'custom-1', name: 'Cable crunch' }
    await other.exercises.add(custom)

    const exercisesBefore = await db.exercises.count()
    const templatesBefore = await db.templates.count()
    const result = await mergeBackup(db, await createBackup(other))

    expect(result).toEqual({ exercises: 1, templates: 4, sessions: 1 }) // 4 templates: different ids
    expect(await db.exercises.count()).toBe(exercisesBefore + 1) // only Cable crunch is new
    expect(await db.templates.count()).toBe(templatesBefore + 4)

    // the imported workout points at this install's exercise rows
    const merged = (await db.sessions.get(session.id))!
    const ownIds = new Set((await db.exercises.toArray()).map((e) => e.id))
    expect(ownIds.has(merged.exercises[0].exerciseId)).toBe(true)

    // merging again changes nothing
    expect(await mergeBackup(db, await createBackup(other))).toEqual({ exercises: 0, templates: 0, sessions: 0 })
  })
})

describe('helpers', () => {
  it('backup status', () => {
    const day = 86_400_000
    expect(backupStatus(undefined, 0)).toBe('nothing-to-protect')
    expect(backupStatus(undefined, 3)).toBe('never')
    expect(backupStatus(1000, 3, 1000 + 15 * day)).toBe('stale')
    expect(backupStatus(1000, 3, 1000 + 3 * day)).toBe('ok')
  })
  it('filename', () => {
    expect(backupFilename(new Date(2026, 9, 6).getTime())).toBe('nickontrack-backup-2026-10-06.json')
  })
})
