import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { db } from '../../db/db'
import { getSettings } from '../../db/queries'
import {
  createBackup,
  mergeBackup,
  parseBackup,
  replaceWithBackup,
  shareOrDownload,
  type BackupFile,
} from '../../lib/backup'
import type { Settings } from '../../db/types'
import { playBeep, unlockAudio } from '../../lib/audio'
import { cancelRestNotificationFor, generateTopic, sendTestNotification } from '../../lib/restNotify'

const card = 'rounded-xl bg-neutral-900 p-4'
const heading = 'mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-500'
const action = 'min-h-12 w-full rounded-xl font-semibold disabled:opacity-40'

async function update(patch: Partial<Settings>) {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 'settings' })
}

function lastBackupLabel(ts?: number) {
  if (!ts) return 'Never'
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  const when = new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return days === 0 ? `Today (${when})` : `${when} (${days} day${days === 1 ? '' : 's'} ago)`
}

export default function SettingsScreen() {
  const settings = useLiveQuery(() => getSettings(), [])
  const fileInput = useRef<HTMLInputElement>(null)
  const [restText, setRestText] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null)

  useEffect(() => {
    if (settings) setRestText((t) => (t === '' ? String(settings.defaultRestSeconds) : t))
  }, [settings])
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  if (!settings) return null

  async function turnOffNotifications() {
    if (!window.confirm('Turn off rest-over notifications? You can switch them on again later.')) return
    const topic = settings?.ntfyTopic
    await update({ ntfyTopic: undefined })
    setNotifyMsg(null)
    if (topic) void cancelRestNotificationFor(topic) // best-effort, in the background
  }

  async function testNotification() {
    if (!settings?.ntfyTopic) return
    setNotifyMsg('Sending…')
    const ok = await sendTestNotification(settings.ntfyTopic)
    setNotifyMsg(
      ok
        ? 'Sent. It should appear on this phone within a few seconds. Nothing? Check steps 2 and 3 above.'
        : "Couldn't reach the notification service. Check your connection and try again.",
    )
  }

  async function copyTopic() {
    try {
      await navigator.clipboard.writeText(settings?.ntfyTopic ?? '')
      setNotifyMsg('Topic copied.')
    } catch {
      setNotifyMsg('Copy failed. Select the topic text and copy it manually.')
    }
  }

  async function exportBackup() {
    setMessage(null)
    try {
      const backup = await createBackup(db)
      if (await shareOrDownload(backup)) {
        await update({ lastBackupAt: backup.exportedAt })
        setMessage({ kind: 'ok', text: 'Backup saved. Keep the file somewhere safe (Files / iCloud).' })
      }
    } catch (err) {
      setMessage({ kind: 'error', text: `Export failed: ${err instanceof Error ? err.message : 'unknown error'}` })
    }
  }

  async function chooseFile(file: File | undefined) {
    setMessage(null)
    setPending(null)
    if (!file) return
    const parsed = parseBackup(await file.text())
    if (parsed.ok) setPending(parsed.backup)
    else setMessage({ kind: 'error', text: parsed.error })
    if (fileInput.current) fileInput.current.value = ''
  }

  async function doReplace() {
    if (!pending) return
    if (!window.confirm('Replace ALL data on this device with the backup? Your current workouts and templates will be overwritten.')) return
    await replaceWithBackup(db, pending)
    setPending(null)
    setMessage({ kind: 'ok', text: 'Backup restored.' })
  }

  async function doMerge() {
    if (!pending) return
    const r = await mergeBackup(db, pending)
    setPending(null)
    setMessage({
      kind: 'ok',
      text: `Merged: ${r.sessions} workout${r.sessions === 1 ? '' : 's'}, ${r.templates} template${r.templates === 1 ? '' : 's'}, ${r.exercises} exercise${r.exercises === 1 ? '' : 's'} added.`,
    })
  }

  const seg = (active: boolean) =>
    `min-h-12 flex-1 rounded-lg font-semibold ${active ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'}`

  return (
    <div className="p-4">
      <h1 className="mb-2 text-2xl font-bold">Settings</h1>

      <h2 className={heading}>Units</h2>
      <div className={`${card} flex gap-2`}>
        <button className={seg(settings.units === 'kg')} onClick={() => update({ units: 'kg' })}>
          kg
        </button>
        <button className={seg(settings.units === 'lb')} onClick={() => update({ units: 'lb' })}>
          lb
        </button>
      </div>
      <p className="mt-1 text-xs text-neutral-500">Weights are stored in kg, so switching never changes your history.</p>

      <h2 className={heading}>Rest timer</h2>
      <div className={`${card} flex flex-col gap-3`}>
        <label className="flex items-center justify-between gap-3">
          <span>
            Default rest (seconds)
            <span className="block text-xs text-neutral-500">Used when an exercise has no rest time.</span>
          </span>
          <input
            className="h-12 w-24 rounded-lg bg-neutral-800 px-2 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
            inputMode="numeric"
            value={restText}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '')
              setRestText(digits)
              const n = Number(digits)
              if (digits && n >= 5 && n <= 900) void update({ defaultRestSeconds: n })
            }}
            aria-label="Default rest seconds"
          />
        </label>
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span>Sound when rest ends</span>
          <input
            type="checkbox"
            className="size-6 accent-emerald-500"
            checked={settings.soundOn}
            onChange={(e) => update({ soundOn: e.target.checked })}
          />
        </label>
        <button
          className="min-h-12 rounded-xl bg-neutral-700 font-semibold"
          onClick={() => {
            unlockAudio()
            void playBeep()
          }}
        >
          Test sound
        </button>
        <p className="-mt-1 text-xs text-neutral-500">
          No sound? Check the silent switch on the side of your iPhone, and the volume.
        </p>
      </div>

      <h2 className={heading}>Rest-over notifications</h2>
      <div className={card}>
        <p className="text-sm text-neutral-300">
          Get a notification when your rest ends, even with NickOnTrack closed or the phone locked. It uses the free{' '}
          <span className="font-semibold">ntfy</span> app.
        </p>
        {!settings.ntfyTopic ? (
          <button
            className={`${action} mt-3 bg-emerald-500 text-black`}
            onClick={() => update({ ntfyTopic: generateTopic() })}
          >
            Set up notifications
          </button>
        ) : (
          <>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-300">
              <li>
                Install the free <span className="font-semibold">ntfy</span> app from the App Store.
              </li>
              <li>
                In ntfy tap <span className="font-semibold">+</span> and enter this topic exactly. Leave the server as
                the default (ntfy.sh).
              </li>
              <li>Allow notifications for ntfy when iPhone asks.</li>
              <li>Tap "Send test notification" below.</li>
            </ol>
            <p className="mt-3 break-all rounded-lg bg-neutral-900 p-3 font-mono text-sm text-emerald-300">
              {settings.ntfyTopic}
            </p>
            <div className="mt-2 flex gap-2">
              <button className={`${action} bg-neutral-700`} onClick={copyTopic}>
                Copy topic
              </button>
              <button className={`${action} bg-emerald-500 text-black`} onClick={testNotification}>
                Send test notification
              </button>
            </div>
            <button className="mt-2 min-h-11 w-full text-sm text-red-400" onClick={turnOffNotifications}>
              Turn off notifications
            </button>
          </>
        )}
        {notifyMsg && <p className="mt-2 text-sm text-neutral-300">{notifyMsg}</p>}
        <p className="mt-3 text-xs text-neutral-500">
          Only the words "Rest over" are sent, never your workouts. Needs a signal, and can arrive a few seconds late.
          Keep the topic private: anyone with it could send you notifications. It is saved in backups. If NickOnTrack
          is open on screen when the rest ends, you get the in-app beep instead.
        </p>
      </div>

      <h2 className={heading}>Backup</h2>
      <div className={card}>
        <p className="text-sm text-neutral-400">
          Last backup: <span className="font-medium text-neutral-200">{lastBackupLabel(settings.lastBackupAt)}</span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Your data lives only on this device. Back up regularly: browsers and iOS can clear storage.
        </p>
        <button className={`${action} mt-3 bg-emerald-500 text-black`} onClick={exportBackup}>
          Export backup
        </button>
        <button className={`${action} mt-2 bg-neutral-800`} onClick={() => fileInput.current?.click()}>
          Import backup…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => chooseFile(e.target.files?.[0])}
        />

        {pending && (
          <div className="mt-3 rounded-lg bg-neutral-800 p-3">
            <p className="font-medium">Backup file ready</p>
            <p className="text-sm text-neutral-400">
              {pending.data.sessions.length} workouts, {pending.data.templates.length} templates,{' '}
              {pending.data.exercises.length} exercises
              {pending.exportedAt ? ` · exported ${new Date(pending.exportedAt).toLocaleDateString()}` : ''}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button className={`${action} bg-neutral-700`} onClick={doMerge}>
                Merge (keep my data, add missing)
              </button>
              <button className={`${action} bg-red-500/20 text-red-300`} onClick={doReplace}>
                Replace everything
              </button>
              <button className="min-h-11 text-sm text-neutral-400" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {message && (
          <p className={`mt-3 text-sm ${message.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</p>
        )}
      </div>

      <h2 className={heading}>Good to know</h2>
      <ul className={`${card} list-disc space-y-2 pl-8 text-sm text-neutral-400`}>
        <li>
          iPhone web apps can't reliably vibrate or play sound when the screen is locked or the app is in the background.
          The rest timer is always accurate when you come back, but it may not alert you.
        </li>
        <li>Keeping the screen awake during a workout is best-effort on iOS.</li>
        <li>Data is stored on this device only. There is no sync, so use backups.</li>
        <li>
          Storage protection from the browser:{' '}
          {persisted === null ? 'unknown' : persisted ? 'on' : 'not granted (adding the app to your Home Screen helps)'}.
        </li>
      </ul>
    </div>
  )
}
