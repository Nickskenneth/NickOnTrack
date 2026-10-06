import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { playBeep } from '../../lib/audio'
import { adjustRest, getRest, remainingMs, skipRest } from '../../lib/restTimer'

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Fixed rest countdown. Remaining time is derived from the stored end time on every tick. */
export default function RestTimerBar({ soundOn }: { soundOn: boolean }) {
  const timer = useLiveQuery(async () => (await getRest()) ?? null, [])
  const [now, setNow] = useState(Date.now())
  const firedFor = useRef<number | null>(null)

  useEffect(() => {
    if (!timer) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [timer])

  useEffect(() => {
    if (!timer || now < timer.endsAt || firedFor.current === timer.endsAt) return
    firedFor.current = timer.endsAt
    // Only alert if it just finished and the app is visible (iOS can't alert in the background).
    if (soundOn && now - timer.endsAt < 5000 && document.visibilityState === 'visible') playBeep()
  }, [now, timer, soundOn])

  useEffect(() => {
    if (timer && now - timer.endsAt > 6000) void skipRest()
  }, [now, timer])

  if (!timer) return null

  const left = remainingMs(timer, now)
  const over = left === 0
  const pct = Math.min(100, (left / (timer.duration * 1000)) * 100)
  const btn = 'min-h-12 rounded-xl bg-neutral-800 px-4 font-semibold active:bg-neutral-700'

  return (
    <div className="border-b border-neutral-800 px-3 pb-3 pt-2" role="timer" aria-live="off">
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full ${over ? 'bg-emerald-400' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{over ? 'Rest over' : 'Rest'}</p>
          <p className={`text-4xl font-bold tabular-nums leading-none ${over ? 'text-emerald-400' : ''}`}>
            {over ? 'Go!' : mmss(left)}
          </p>
        </div>
        <button className={btn} onClick={() => adjustRest(-15)} aria-label="Subtract 15 seconds">
          −15
        </button>
        <button className={btn} onClick={() => adjustRest(15)} aria-label="Add 15 seconds">
          +15
        </button>
        <button className={`${btn} text-emerald-400`} onClick={() => skipRest()}>
          Skip
        </button>
      </div>
    </div>
  )
}
