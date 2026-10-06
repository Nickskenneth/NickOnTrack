import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { discardSession, getSettings, listFinishedSessions } from '../../db/queries'
import type { Session } from '../../db/types'
import { formatDate, formatDuration, formatVolume, sessionVolumeKg } from './historyLogic'

export default function HistoryScreen() {
  const sessions = useLiveQuery(() => listFinishedSessions(), [])
  const settings = useLiveQuery(() => getSettings(), [])

  async function remove(s: Session) {
    if (!window.confirm(`Delete "${s.name}" from your history? This cannot be undone.`)) return
    await discardSession(s.id)
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">History</h1>
      <ul className="flex flex-col gap-3">
        {sessions?.map((s) => (
          <li key={s.id} className="flex items-stretch overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800">
            <Link to={`/history/${s.id}`} className="min-w-0 flex-1 p-4 active:bg-neutral-700">
              <h2 className="truncate font-semibold">{s.name}</h2>
              <p className="text-sm text-neutral-400">{formatDate(s.startedAt)}</p>
              <p className="mt-1 text-sm text-neutral-300">
                {formatDuration((s.finishedAt ?? s.startedAt) - s.startedAt)}
                {settings && ` · ${formatVolume(sessionVolumeKg(s), settings.units)}`}
              </p>
            </Link>
            <button
              className="w-16 shrink-0 border-l border-neutral-700 text-sm font-medium text-red-400 active:bg-neutral-700"
              onClick={() => remove(s)}
              aria-label={`Delete ${s.name}`}
            >
              Delete
            </button>
          </li>
        ))}
        {sessions?.length === 0 && (
          <li className="rounded-xl bg-neutral-900 p-6 text-center text-neutral-500">
            No finished workouts yet. Finish one and it will show up here.
          </li>
        )}
      </ul>
    </div>
  )
}
