import { useState } from 'react'
import { setSessionRest } from '../../db/queries'
import { formatRest, MAX_REST_SECONDS, MIN_REST_SECONDS, parseRestSeconds } from '../../lib/duration'

interface Props {
  sessionId: string
  order: number
  seconds: number
  label: string // "Rest" or "Rest after pair"
  canSaveToTemplate: boolean
}

/** Shows an exercise's rest time and lets you set it by hand (this workout, optionally the template too). */
export default function RestEditor({ sessionId, order, seconds, label, canSaveToTemplate }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saveToTemplate, setSaveToTemplate] = useState(true)

  const parsed = parseRestSeconds(text)

  function start() {
    setText(String(seconds))
    setOpen(true)
  }
  function nudge(delta: number) {
    const base = parsed ?? seconds
    setText(String(Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, base + delta))))
  }
  async function save() {
    if (parsed === undefined) return
    await setSessionRest(sessionId, order, parsed, canSaveToTemplate && saveToTemplate)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        className="mt-2 flex min-h-11 items-center gap-2 rounded-lg bg-neutral-700 px-3 text-sm font-medium active:bg-neutral-600"
        onClick={start}
        aria-label={`${label} ${formatRest(seconds)}. Tap to change`}
      >
        <span aria-hidden>⏱</span>
        <span>
          {label} <span className="font-bold tabular-nums">{formatRest(seconds)}</span>
        </span>
        <span className="text-xs text-emerald-400">Change</span>
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-lg bg-neutral-900 p-3">
      <p className="text-sm font-medium">{label} (seconds)</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          className="min-h-12 min-w-14 rounded-lg bg-neutral-700 font-semibold active:bg-neutral-600"
          onClick={() => nudge(-15)}
        >
          −15
        </button>
        <input
          className="h-12 min-w-0 flex-1 rounded-lg bg-neutral-800 px-2 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
          inputMode="numeric"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
          aria-label="Rest seconds"
        />
        <button
          className="min-h-12 min-w-14 rounded-lg bg-neutral-700 font-semibold active:bg-neutral-600"
          onClick={() => nudge(15)}
        >
          +15
        </button>
      </div>
      <p className={`mt-1 text-center text-sm ${parsed === undefined ? 'text-red-400' : 'text-neutral-400'}`}>
        {parsed === undefined
          ? `Enter ${MIN_REST_SECONDS} to ${MAX_REST_SECONDS} seconds`
          : `= ${formatRest(parsed)}`}
      </p>
      {canSaveToTemplate && (
        <label className="mt-1 flex min-h-11 items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            className="size-5 accent-emerald-500"
            checked={saveToTemplate}
            onChange={(e) => setSaveToTemplate(e.target.checked)}
          />
          Also save to the template
        </label>
      )}
      <div className="mt-2 flex gap-2">
        <button className="min-h-11 flex-1 rounded-lg bg-neutral-700 font-medium" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          className="min-h-11 flex-[2] rounded-lg bg-emerald-500 font-semibold text-black disabled:opacity-40"
          disabled={parsed === undefined}
          onClick={save}
        >
          Save
        </button>
      </div>
    </div>
  )
}
