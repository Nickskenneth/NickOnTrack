import { db as defaultDb, type NickOnTrackDB } from '../db/db'
import { getSettings } from '../db/queries'
import { adjustRest, getRest, skipRest, startRest } from './restTimer'

// Optional "rest over" push notification while the app is closed or in the background.
// iOS web apps can't run timers in the background, so we ask the free ntfy.sh service to
// deliver a notification at the right moment to the ntfy iPhone app. No server of ours.
// Only the words "Rest over" are sent, never workout data. One scheduled message
// ("sequence id" = rest) is replaced when the timer changes and deleted when it ends early.

const SERVER = 'https://ntfy.sh'
export const MIN_DELAY_MS = 10_000 // ntfy's minimum scheduling delay
const SEQUENCE = 'rest'

export const topicUrl = (topic: string) => `${SERVER}/${encodeURIComponent(topic)}`

export function generateTopic(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return `nickontrack-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`
}

/** The scheduling request for a timer ending at `endsAt`, or null if it's too soon to schedule. */
export function buildScheduleRequest(
  topic: string,
  endsAt: number,
  now: number,
): { url: string; init: RequestInit } | null {
  if (endsAt - now < MIN_DELAY_MS) return null
  return {
    url: `${topicUrl(topic)}/${SEQUENCE}`,
    init: {
      method: 'POST',
      body: 'Time for your next set.',
      headers: {
        'X-Delay': String(Math.floor(endsAt / 1000)),
        Title: 'Rest over',
        Tags: 'muscle',
        Priority: 'high',
      },
    },
  }
}

async function topicOf(db: NickOnTrackDB): Promise<string | undefined> {
  return (await getSettings(db)).ntfyTopic || undefined
}

async function send(url: string, init: RequestInit): Promise<boolean> {
  try {
    const res = await fetch(url, { ...init, keepalive: true })
    return res.ok
  } catch {
    return false // offline or blocked: the in-app timer still works
  }
}

/** Makes the scheduled notification match the current timer (or removes it if there is none). */
export async function syncRestNotification(db: NickOnTrackDB = defaultDb, now = Date.now()): Promise<void> {
  const topic = await topicOf(db)
  if (!topic) return
  const timer = await getRest(db)
  const req = timer ? buildScheduleRequest(topic, timer.endsAt, now) : null
  if (req) await send(req.url, req.init)
  else await cancelRestNotification(db)
}

export async function cancelRestNotificationFor(topic: string): Promise<void> {
  await send(`${topicUrl(topic)}/${SEQUENCE}`, { method: 'DELETE' })
}

export async function cancelRestNotification(db: NickOnTrackDB = defaultDb): Promise<void> {
  const topic = await topicOf(db)
  if (topic) await cancelRestNotificationFor(topic)
}

export async function sendTestNotification(topic: string): Promise<boolean> {
  return send(topicUrl(topic), {
    method: 'POST',
    body: 'Rest-over alerts are working.',
    headers: { Title: 'NickOnTrack test', Tags: 'muscle' },
  })
}

// Timer actions that also keep the notification in step.
export async function startRestNotified(seconds: number): Promise<void> {
  await startRest(seconds)
  await syncRestNotification()
}
export async function adjustRestNotified(deltaSeconds: number): Promise<void> {
  await adjustRest(deltaSeconds)
  await syncRestNotification()
}
export async function skipRestNotified(): Promise<void> {
  await skipRest()
  await cancelRestNotification()
}
