import { useState } from 'react'
import { addSessionSet, removeLastSessionSet, swapSessionExercise } from '../../db/queries'
import type { Exercise, SessionExercise, SessionSet } from '../../db/types'
import type { Units } from '../../lib/units'
import ExercisePicker from '../exercises/ExercisePicker'
import SetRow from './SetRow'

interface Props {
  sessionId: string
  ex: SessionExercise
  exercise?: Exercise
  originalName?: string
  previous?: SessionSet[]
  placeholderFor: (prev: SessionSet[] | undefined, index: number) => SessionSet | undefined
  units: Units
  groupPosition: 'none' | 'start' | 'middle' | 'end'
  groupLabel?: string
  onSetCompleted?: (ex: SessionExercise, set: SessionSet) => void
}

export default function ExerciseCard({
  sessionId,
  ex,
  exercise,
  originalName,
  previous,
  placeholderFor,
  units,
  groupPosition,
  groupLabel,
  onSetCompleted,
}: Props) {
  const [picker, setPicker] = useState(false)
  const inGroup = groupPosition !== 'none'

  const range = ex.repMin !== undefined && ex.repMax !== undefined
    ? ex.repMin === ex.repMax
      ? `${ex.repMin}`
      : `${ex.repMin}-${ex.repMax}`
    : undefined
  const target = range
    ? `${ex.sets.length} × ${range}${ex.isTimed ? 's' : ''}${ex.perSide ? ' per side' : ''}`
    : undefined

  function swap(newExercise: Exercise) {
    setPicker(false)
    if (newExercise.id === ex.exerciseId) return
    const anyDone = ex.sets.some((s) => s.completed)
    if (anyDone && !window.confirm('Swapping clears the sets you logged for this exercise. Continue?')) return
    swapSessionExercise(sessionId, ex.order, newExercise.id)
  }

  const radius =
    groupPosition === 'start' ? 'rounded-b-none' : groupPosition === 'middle' ? 'rounded-none' : groupPosition === 'end' ? 'rounded-t-none' : ''

  return (
    <section
      className={`rounded-xl bg-neutral-900 p-3 ${radius} ${inGroup ? 'border-l-4 border-emerald-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">
            {groupLabel && (
              <span className="mr-2 rounded bg-emerald-500 px-1.5 py-0.5 align-middle text-xs font-bold text-black">
                {groupLabel}
              </span>
            )}
            {exercise?.name ?? '…'}
          </h3>
          {target && <p className="text-sm text-neutral-500">{target}</p>}
          {ex.swappedFromExerciseId && originalName && (
            <p className="text-xs text-amber-400">Swapped for this workout (was {originalName})</p>
          )}
        </div>
        <button
          className="min-h-11 shrink-0 rounded-lg bg-neutral-800 px-3 text-sm font-medium active:bg-neutral-700"
          onClick={() => setPicker(true)}
        >
          Swap
        </button>
      </div>

      {(exercise?.note || ex.note) && (
        <p className="mt-1 whitespace-pre-line rounded-lg bg-neutral-800/60 px-2 py-1.5 text-sm text-amber-200/90">
          {[exercise?.note, ex.note].filter(Boolean).join('\n')}
        </p>
      )}

      <div className="mt-2 grid grid-cols-[1.75rem_1fr_4.25rem_4.25rem_3rem] gap-2 px-1 text-xs uppercase tracking-wide text-neutral-600">
        <span className="text-center">Set</span>
        <span>Previous</span>
        <span className="text-center">{units}</span>
        <span className="text-center">{ex.isTimed ? 'Sec' : 'Reps'}</span>
        <span />
      </div>
      <div className="flex flex-col gap-1">
        {ex.sets.map((s) => (
          <SetRow
            key={s.index}
            sessionId={sessionId}
            order={ex.order}
            set={s}
            placeholder={placeholderFor(previous, s.index)}
            units={units}
            isTimed={ex.isTimed}
            onCompleted={(set) => onSetCompleted?.(ex, set)}
          />
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          className="min-h-11 flex-1 rounded-lg bg-neutral-800 text-sm font-medium active:bg-neutral-700"
          onClick={() => addSessionSet(sessionId, ex.order)}
        >
          + Add set
        </button>
        {ex.sets.length > 1 && (
          <button
            className="min-h-11 rounded-lg bg-neutral-800 px-4 text-sm text-neutral-400 active:bg-neutral-700"
            onClick={() => removeLastSessionSet(sessionId, ex.order)}
          >
            − Remove last
          </button>
        )}
      </div>

      {picker && <ExercisePicker title="Swap for this workout" onPick={swap} onClose={() => setPicker(false)} />}
    </section>
  )
}
