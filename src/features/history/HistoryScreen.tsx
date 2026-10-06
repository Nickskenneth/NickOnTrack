import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { getSettings, listFinishedSessions } from '../../db/queries'
import { formatDate, formatDuration, formatVolume, sessionVolumeKg } from './historyLogic'

export default function HistoryScreen() {
  const sessions = useLiveQuery(() => listFinishedSessions(), [])
  const settings = useLiveQuery(() => getSettings(), [])

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">History</h1>
      <ul className="flex flex-col gap-3">
        {sessions?.map((s) => (
          <li key={s.id}>
            <Link to={`/history/${s.id}`} className="block rounded-xl bg-neutral-900 p-4 active:bg-neutral-800">
              <h2 className="font-semibold">{s.name}</h2>
              <p className="text-sm text-neutral-500">{formatDate(s.startedAt)}</p>
              <p className="mt-1 text-sm text-neutral-400">
                {formatDuration((s.finishedAt ?? s.startedAt) - s.startedAt)}
                {settings && ` · ${formatVolume(sessionVolumeKg(s), settings.units)}`}
              </p>
            </Link>
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
