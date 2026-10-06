import { useState } from 'react'
import type { Exercise } from '../../db/types'

const field =
  'w-full rounded-lg bg-neutral-800 px-3 py-3 text-base text-neutral-100 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-emerald-500'

interface Props {
  initial: Exercise
  submitLabel: string
  onSubmit: (exercise: Exercise) => void | Promise<void>
}

/** Name, muscle group, equipment and the persistent note. Shared by create and edit. */
export default function ExerciseForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial.name)
  const [muscleGroup, setMuscleGroup] = useState(initial.muscleGroup ?? '')
  const [equipment, setEquipment] = useState(initial.equipment ?? '')
  const [note, setNote] = useState(initial.note ?? '')

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        void onSubmit({
          ...initial,
          name: name.trim(),
          muscleGroup: muscleGroup.trim() || undefined,
          equipment: equipment.trim() || undefined,
          note: note.trim() || undefined,
        })
      }}
    >
      <input className={field} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className={field}
        placeholder="Muscle group (optional)"
        value={muscleGroup}
        onChange={(e) => setMuscleGroup(e.target.value)}
      />
      <input
        className={field}
        placeholder="Equipment (optional)"
        value={equipment}
        onChange={(e) => setEquipment(e.target.value)}
      />
      <textarea
        className={`${field} min-h-20`}
        placeholder="Note shown every time you do this exercise (e.g. pins at hole 4)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="min-h-12 rounded-xl bg-emerald-500 font-semibold text-black disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </form>
  )
}
