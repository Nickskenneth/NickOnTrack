import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import { getSettings } from '../../db/queries'
import { backupStatus } from '../../lib/backup'

/** Gentle nudge shown on the Workout tab when there is history and no recent backup. */
export default function BackupReminder() {
  const status = useLiveQuery(async () => {
    const settings = await getSettings()
    const finished = await db.sessions.filter((s) => s.finishedAt != null).count()
    return backupStatus(settings.lastBackupAt, finished)
  }, [])

  if (status !== 'never' && status !== 'stale') return null
  return (
    <Link
      to="/settings"
      className="mb-4 block rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200"
    >
      {status === 'never' ? "You haven't backed up your workouts yet." : "It's been over 2 weeks since your last backup."}{' '}
      <span className="font-semibold underline">Back up now</span>
    </Link>
  )
}
