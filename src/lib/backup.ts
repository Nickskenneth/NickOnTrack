import { DEFAULT_SETTINGS, type NickOnTrackDB } from '../db/db'
import type { Exercise, Session, Settings, Template } from '../db/types'

export const BACKUP_VERSION = 1
export const BACKUP_STALE_DAYS = 14

export interface BackupFile {
  app: 'NickOnTrack'
  version: number
  exportedAt: number
  data: {
    exercises: Exercise[]
    templates: Template[]
    sessions: Session[]
    settings: Settings | null
  }
}

export interface MergeResult {
  exercises: number
  templates: number
  sessions: number
}

export async function createBackup(db: NickOnTrackDB, now = Date.now()): Promise<BackupFile> {
  const [exercises, templates, sessions, settings] = await Promise.all([
    db.exercises.toArray(),
    db.templates.toArray(),
    db.sessions.toArray(),
    db.settings.get('settings'),
  ])
  return {
    app: 'NickOnTrack',
    version: BACKUP_VERSION,
    exportedAt: now,
    data: { exercises, templates, sessions, settings: settings ?? null },
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function parseBackup(text: string): { ok: true; backup: BackupFile } | { ok: false; error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }
  if (!isObj(raw) || raw.app !== 'NickOnTrack') return { ok: false, error: 'This is not a NickOnTrack backup file.' }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the app. Update the app first.' }
  }
  const data = raw.data
  if (!isObj(data)) return { ok: false, error: 'The backup has no data section.' }

  const { exercises, templates, sessions } = data
  if (!Array.isArray(exercises) || !Array.isArray(templates) || !Array.isArray(sessions)) {
    return { ok: false, error: 'The backup is missing exercises, templates or sessions.' }
  }
  const hasId = (x: unknown) => isObj(x) && typeof x.id === 'string' && x.id.length > 0
  if (!exercises.every((e) => hasId(e) && typeof (e as Exercise).name === 'string')) {
    return { ok: false, error: 'Some exercises in the backup are malformed.' }
  }
  if (!templates.every((t) => hasId(t) && Array.isArray((t as Template).exercises))) {
    return { ok: false, error: 'Some templates in the backup are malformed.' }
  }
  if (
    !sessions.every(
      (s) =>
        hasId(s) &&
        Array.isArray((s as Session).exercises) &&
        (s as Session).exercises.every((e) => Array.isArray(e.sets)),
    )
  ) {
    return { ok: false, error: 'Some workouts in the backup are malformed.' }
  }

  return {
    ok: true,
    backup: {
      app: 'NickOnTrack',
      version: raw.version,
      exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
      data: {
        exercises: exercises as Exercise[],
        templates: templates as Template[],
        sessions: sessions as Session[],
        settings: isObj(data.settings) ? ({ ...DEFAULT_SETTINGS, ...data.settings, id: 'settings' } as Settings) : null,
      },
    },
  }
}

/** Replaces everything with the backup's contents. */
export async function replaceWithBackup(db: NickOnTrackDB, backup: BackupFile): Promise<void> {
  const { exercises, templates, sessions, settings } = backup.data
  await db.transaction('rw', [db.exercises, db.templates, db.sessions, db.settings, db.meta], async () => {
    await Promise.all([db.exercises.clear(), db.templates.clear(), db.sessions.clear(), db.settings.clear()])
    await db.exercises.bulkAdd(exercises)
    await db.templates.bulkAdd(templates)
    await db.sessions.bulkAdd(sessions)
    await db.settings.put(settings ?? DEFAULT_SETTINGS)
    await db.meta.delete('restTimer')
    await db.meta.put({ key: 'seeded', value: Date.now() }) // never re-seed over restored data
  })
}

/**
 * Adds what is missing and keeps what exists. Exercises that already exist by id, or
 * by name (starter exercises get different ids on each install), are reused and the
 * imported templates/workouts are re-pointed at them.
 */
export async function mergeBackup(db: NickOnTrackDB, backup: BackupFile): Promise<MergeResult> {
  const result: MergeResult = { exercises: 0, templates: 0, sessions: 0 }
  await db.transaction('rw', [db.exercises, db.templates, db.sessions], async () => {
    const existing = await db.exercises.toArray()
    const idByName = new Map(existing.map((e) => [e.name.trim().toLowerCase(), e.id]))
    const ids = new Set(existing.map((e) => e.id))
    const remap = new Map<string, string>()

    for (const e of backup.data.exercises) {
      const byName = idByName.get(e.name.trim().toLowerCase())
      if (ids.has(e.id)) remap.set(e.id, e.id)
      else if (byName) remap.set(e.id, byName)
      else {
        await db.exercises.add(e)
        ids.add(e.id)
        idByName.set(e.name.trim().toLowerCase(), e.id)
        remap.set(e.id, e.id)
        result.exercises++
      }
    }
    const map = (id: string) => remap.get(id) ?? id

    for (const t of backup.data.templates) {
      if (await db.templates.get(t.id)) continue
      await db.templates.add({ ...t, exercises: t.exercises.map((e) => ({ ...e, exerciseId: map(e.exerciseId) })) })
      result.templates++
    }

    const hasActive = (await db.sessions.filter((s) => s.finishedAt == null).count()) > 0
    for (const s of backup.data.sessions) {
      if (await db.sessions.get(s.id)) continue
      if (s.finishedAt == null && hasActive) continue // only one workout can be in progress
      await db.sessions.add({
        ...s,
        exercises: s.exercises.map((e) => ({
          ...e,
          exerciseId: map(e.exerciseId),
          swappedFromExerciseId: e.swappedFromExerciseId ? map(e.swappedFromExerciseId) : undefined,
        })),
      })
      result.sessions++
    }
  })
  return result
}

export function backupFilename(now = Date.now()): string {
  const d = new Date(now)
  const p = (n: number) => String(n).padStart(2, '0')
  return `nickontrack-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`
}

export type BackupStatus = 'ok' | 'never' | 'stale' | 'nothing-to-protect'

export function backupStatus(lastBackupAt: number | undefined, finishedSessions: number, now = Date.now()): BackupStatus {
  if (finishedSessions === 0) return 'nothing-to-protect'
  if (!lastBackupAt) return 'never'
  return now - lastBackupAt > BACKUP_STALE_DAYS * 86_400_000 ? 'stale' : 'ok'
}

/** Shares via the iOS share sheet (Files/iCloud) when possible, else downloads. true = delivered. */
export async function shareOrDownload(backup: BackupFile): Promise<boolean> {
  const filename = backupFilename(backup.exportedAt)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const file = new File([blob], filename, { type: 'application/json' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'NickOnTrack backup' })
      return true
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false // user cancelled
      // otherwise fall through to a normal download
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}
