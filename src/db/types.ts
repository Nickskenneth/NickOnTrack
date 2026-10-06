// Data model. Weights are stored in kg; convert for display (see lib/units.ts).

export interface Exercise {
  id: string
  name: string
  muscleGroup?: string
  equipment?: string
  note?: string // persistent note shown in workouts
  archived?: boolean // hidden from pickers; kept so history never loses a name
}

export interface TemplateExercise {
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  restSeconds: number // after each set; for supersets, stored on the LAST exercise of the group
  supersetGroup?: string
  order: number
  isTimed?: boolean // reps field is seconds
  perSide?: boolean
  note?: string
}

export interface Template {
  id: string
  name: string
  note?: string // free text, e.g. warm-up / finisher reminders
  exercises: TemplateExercise[]
  createdAt: number
  updatedAt: number
}

export interface SessionSet {
  index: number // 0-based
  weight?: number // kg
  reps?: number // or seconds if timed
  completed: boolean
  completedAt?: number
}

export interface SessionExercise {
  exerciseId: string
  order: number
  restSeconds: number
  supersetGroup?: string
  repMin?: number
  repMax?: number
  isTimed?: boolean
  perSide?: boolean
  note?: string // slot note copied from the template
  swappedFromExerciseId?: string // set when swapped for this session only
  sets: SessionSet[]
}

export interface Session {
  id: string
  templateId?: string
  name: string
  startedAt: number
  finishedAt?: number // undefined = in progress
  note?: string
  exercises: SessionExercise[]
}

export interface Settings {
  id: 'settings'
  units: 'kg' | 'lb'
  soundOn: boolean
  defaultRestSeconds: number
  lastBackupAt?: number
}

export interface MetaRow {
  key: string
  value: unknown
}
