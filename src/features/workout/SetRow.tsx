import { useEffect, useState } from 'react'
import { updateSessionSet } from '../../db/queries'
import type { SessionSet } from '../../db/types'
import { unlockAudio } from '../../lib/audio'
import { formatWeight, fromDisplay, parseNumber, type Units } from '../../lib/units'
import { previousLabel, resolveCompletion } from './setLogic'

interface Props {
  sessionId: string
  order: number
  set: SessionSet
  placeholder?: SessionSet
  units: Units
  isTimed?: boolean
  onCompleted?: (set: SessionSet) => void // hook for the rest timer (step 5)
}

const input =
  'h-12 w-full rounded-lg bg-neutral-900 px-2 text-center text-lg font-semibold text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:font-normal placeholder:text-neutral-500'

const weightText = (kg: number | undefined, units: Units) => (kg === undefined ? '' : formatWeight(kg, units))
const repsText = (n: number | undefined) => (n === undefined ? '' : String(n))

export default function SetRow({ sessionId, order, set, placeholder, units, isTimed, onCompleted }: Props) {
  const [w, setW] = useState(weightText(set.weight, units))
  const [r, setR] = useState(repsText(set.reps))
  const [invalid, setInvalid] = useState(false)

  // Sync from the database only when it differs from what's typed (keeps "12." editable).
  useEffect(() => {
    const typed = parseNumber(w)
    const stored = set.weight
    const same =
      typed === undefined || stored === undefined
        ? typed === stored
        : Math.abs(fromDisplay(typed, units) - stored) < 0.01
    if (!same) setW(weightText(stored, units))
  }, [set.weight, units]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (parseNumber(r) !== set.reps) setR(repsText(set.reps))
  }, [set.reps]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = (patch: Partial<SessionSet>) => updateSessionSet(sessionId, order, set.index, patch)

  function onWeight(text: string) {
    setW(text)
    setInvalid(false)
    const n = parseNumber(text)
    save({ weight: n === undefined ? undefined : fromDisplay(n, units) })
  }
  function onReps(text: string) {
    setR(text)
    setInvalid(false)
    const n = parseNumber(text)
    save({ reps: n === undefined ? undefined : Math.round(n) })
  }

  function copyPrevious() {
    if (!placeholder) return
    setInvalid(false)
    save({ weight: placeholder.weight, reps: placeholder.reps })
  }

  function toggle() {
    if (set.completed) {
      save({ completed: false, completedAt: undefined })
      return
    }
    const result = resolveCompletion(set, placeholder)
    if (!result.ok) return setInvalid(true)
    unlockAudio() // inside a tap, so iOS allows the finish sound later
    const completedAt = Date.now()
    save({ weight: result.weight, reps: result.reps, completed: true, completedAt })
    onCompleted?.({ ...set, weight: result.weight, reps: result.reps, completed: true, completedAt })
  }

  const prev = previousLabel(placeholder, units, isTimed)

  return (
    <div
      className={`grid grid-cols-[1.75rem_1fr_4.25rem_4.25rem_3rem] items-center gap-2 rounded-lg px-1 py-1 ${
        set.completed ? 'bg-emerald-500/20' : ''
      }`}
    >
      <span className="text-center font-semibold text-neutral-400">{set.index + 1}</span>
      <button
        className="min-h-11 truncate text-left text-sm text-neutral-300 disabled:cursor-default"
        disabled={!placeholder}
        onClick={copyPrevious}
        aria-label="Copy previous values"
      >
        {prev}
      </button>
      <input
        className={input}
        inputMode="decimal"
        placeholder={placeholder?.weight !== undefined ? formatWeight(placeholder.weight, units) : units}
        value={w}
        onChange={(e) => onWeight(e.target.value)}
        aria-label={`Set ${set.index + 1} weight`}
      />
      <input
        className={`${input} ${invalid ? 'ring-2 ring-red-500' : ''}`}
        inputMode="numeric"
        placeholder={placeholder?.reps !== undefined ? String(placeholder.reps) : isTimed ? 'sec' : 'reps'}
        value={r}
        onChange={(e) => onReps(e.target.value)}
        aria-label={`Set ${set.index + 1} ${isTimed ? 'seconds' : 'reps'}`}
      />
      <button
        className={`flex size-12 items-center justify-center rounded-lg text-xl font-bold ${
          set.completed ? 'bg-emerald-500 text-black' : 'bg-neutral-700 text-neutral-300'
        }`}
        onClick={toggle}
        aria-label={set.completed ? 'Mark set incomplete' : 'Complete set'}
        aria-pressed={set.completed}
      >
        ✓
      </button>
    </div>
  )
}
