import { newId } from '../lib/id'
import type { NickOnTrackDB } from './db'
import { DEFAULT_SETTINGS } from './db'
import type { Exercise, Template, TemplateExercise } from './types'

// Starting content only. Loaded once (guarded by the 'seeded' meta flag), then
// everything is editable in the app; edits are never overwritten.

type ExerciseSeed = Omit<Exercise, 'id'>

const EXERCISES: ExerciseSeed[] = [
  {
    name: 'Barbell back squat',
    muscleGroup: 'quads',
    equipment: 'barbell',
    note: '2-3 warm-up ramp sets first. Safety pins just below bottom. Wider stance, toes out 15-30°. Small plates under heels if needed.',
  },
  { name: 'Incline DB press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { name: 'Lat pulldown', muscleGroup: 'back', equipment: 'cable' },
  { name: 'DB lateral raise', muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { name: 'EZ bar curl', muscleGroup: 'biceps', equipment: 'ez bar' },
  { name: 'Dead bug', muscleGroup: 'core', equipment: 'bodyweight' },
  { name: 'Romanian deadlift', muscleGroup: 'hamstrings', equipment: 'barbell' },
  {
    name: 'Barbell hip thrust',
    muscleGroup: 'glutes',
    equipment: 'barbell',
    note: 'Upper back on bench.',
  },
  {
    name: 'Pull-ups',
    muscleGroup: 'back',
    equipment: 'bodyweight',
    note: 'Or negatives / pulldown.',
  },
  { name: 'Seated DB overhead press', muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { name: 'Cable pushdown (W bar)', muscleGroup: 'triceps', equipment: 'cable' },
  { name: 'Cable Pallof press', muscleGroup: 'core', equipment: 'cable' },
  { name: 'DB Bulgarian split squat', muscleGroup: 'quads', equipment: 'dumbbell' },
  { name: 'Flat DB bench press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { name: 'Cable row (D handle)', muscleGroup: 'back', equipment: 'cable' },
  { name: 'Rear delt raise', muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { name: 'Cable lateral raise', muscleGroup: 'shoulders', equipment: 'cable' },
  { name: 'Hammer curl', muscleGroup: 'biceps', equipment: 'dumbbell' },
  { name: 'Overhead DB triceps extension', muscleGroup: 'triceps', equipment: 'dumbbell' },
  { name: 'Lying leg raise', muscleGroup: 'core', equipment: 'bodyweight' },
  {
    name: 'Single-leg hip thrust',
    muscleGroup: 'glutes',
    equipment: 'dumbbell',
    note: 'Back on bench, DB on hip.',
  },
  { name: 'Face pull', muscleGroup: 'shoulders', equipment: 'cable' },
  { name: 'Incline DB curl', muscleGroup: 'biceps', equipment: 'dumbbell' },
  { name: 'EZ bar skull crusher', muscleGroup: 'triceps', equipment: 'ez bar' },
  { name: 'Hanging knee raise', muscleGroup: 'core', equipment: 'bodyweight' },
  { name: 'Side plank', muscleGroup: 'core', equipment: 'bodyweight' },
  // Library-only swap option
  { name: 'Goblet squat', muscleGroup: 'quads', equipment: 'dumbbell' },
]

type Row = Omit<TemplateExercise, 'exerciseId' | 'order'> & { exercise: string }
type TemplateSeed = { name: string; note?: string; rows: Row[] }

const WARMUP =
  'Warm-up (5-8 min): 90/90 hip switches, half-kneeling hip flexor stretch, glute bridges x10, wall slides x10, thoracic rotations.'
const FINISH =
  'Finish: 20-30 min incline walk (8-12%, ~4.5-5.5 km/h, no handrails). Stretch hip flexor, hamstring, chest/shoulder 30-60s each.'

// Supersets: rest is stored on the last exercise of the pair; the first
// exercise carries 0 and its between-exercise rest is kept in the note.
const TEMPLATES: TemplateSeed[] = [
  {
    name: 'Full Body Day 1',
    note: `Squat + Press.\n${WARMUP}\n${FINISH}`,
    rows: [
      { exercise: 'Barbell back squat', sets: 3, repMin: 6, repMax: 8, restSeconds: 150 },
      { exercise: 'Incline DB press', sets: 3, repMin: 8, repMax: 12, restSeconds: 105 },
      { exercise: 'Lat pulldown', sets: 3, repMin: 8, repMax: 12, restSeconds: 105 },
      { exercise: 'DB lateral raise', sets: 3, repMin: 12, repMax: 15, restSeconds: 75 },
      { exercise: 'EZ bar curl', sets: 3, repMin: 10, repMax: 12, restSeconds: 75 },
      { exercise: 'Dead bug', sets: 3, repMin: 8, repMax: 8, restSeconds: 50, perSide: true },
    ],
  },
  {
    name: 'Full Body Day 2',
    note: `Hinge + Pull.\n${WARMUP}\n${FINISH}`,
    rows: [
      { exercise: 'Romanian deadlift', sets: 3, repMin: 8, repMax: 10, restSeconds: 150 },
      { exercise: 'Barbell hip thrust', sets: 3, repMin: 8, repMax: 12, restSeconds: 150 },
      { exercise: 'Pull-ups', sets: 3, repMin: 5, repMax: 10, restSeconds: 105 },
      { exercise: 'Seated DB overhead press', sets: 3, repMin: 8, repMax: 10, restSeconds: 150 },
      { exercise: 'Cable pushdown (W bar)', sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
      { exercise: 'Cable Pallof press', sets: 3, repMin: 10, repMax: 10, restSeconds: 50, perSide: true },
    ],
  },
  {
    name: 'Full Body Day 3',
    note: `Glutes + Shoulders + Arms.\n${WARMUP}\n${FINISH}`,
    rows: [
      {
        exercise: 'DB Bulgarian split squat',
        sets: 3,
        repMin: 8,
        repMax: 10,
        restSeconds: 105,
        perSide: true,
        note: 'Swap for goblet squat if balance or hips are an issue.',
      },
      { exercise: 'Flat DB bench press', sets: 3, repMin: 8, repMax: 12, restSeconds: 150 },
      { exercise: 'Cable row (D handle)', sets: 3, repMin: 10, repMax: 12, restSeconds: 105 },
      {
        exercise: 'Rear delt raise',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSeconds: 0,
        supersetGroup: 'A',
        note: 'Superset A: rest 30-45s between the two.',
      },
      { exercise: 'Cable lateral raise', sets: 3, repMin: 12, repMax: 15, restSeconds: 75, supersetGroup: 'A' },
      {
        exercise: 'Hammer curl',
        sets: 3,
        repMin: 10,
        repMax: 12,
        restSeconds: 0,
        supersetGroup: 'B',
        note: 'Superset B: rest 0-30s between the two.',
      },
      {
        exercise: 'Overhead DB triceps extension',
        sets: 3,
        repMin: 10,
        repMax: 12,
        restSeconds: 75,
        supersetGroup: 'B',
      },
      { exercise: 'Lying leg raise', sets: 3, repMin: 10, repMax: 12, restSeconds: 50 },
    ],
  },
  {
    name: 'Full Body Day 4 (Light)',
    note: `Optional, about 40 min. Lighter: leave 2-3 reps in reserve on everything.\nSwaps: elbows complain -> cable pushdowns instead of skull crushers. Hanging bothers stiff shoulders -> lying leg raises.\n${WARMUP}\n${FINISH}`,
    rows: [
      {
        exercise: 'Single-leg hip thrust',
        sets: 3,
        repMin: 10,
        repMax: 12,
        restSeconds: 90,
        perSide: true,
        note: 'Rest 90s after both legs are done.',
      },
      {
        exercise: 'Cable lateral raise',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSeconds: 0,
        supersetGroup: 'C',
        note: 'Superset C: rest 30-45s between the two.',
      },
      { exercise: 'Face pull', sets: 3, repMin: 12, repMax: 15, restSeconds: 75, supersetGroup: 'C' },
      {
        exercise: 'Incline DB curl',
        sets: 3,
        repMin: 10,
        repMax: 12,
        restSeconds: 0,
        supersetGroup: 'D',
        note: 'Superset D: rest 0-30s between the two.',
      },
      { exercise: 'EZ bar skull crusher', sets: 3, repMin: 10, repMax: 12, restSeconds: 75, supersetGroup: 'D' },
      {
        exercise: 'Hanging knee raise',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSeconds: 0,
        supersetGroup: 'E',
        note: 'Superset E: rest 0-30s between the two.',
      },
      {
        exercise: 'Side plank',
        sets: 2,
        repMin: 30,
        repMax: 45,
        restSeconds: 60,
        supersetGroup: 'E',
        isTimed: true,
        perSide: true,
      },
    ],
  },
]

/** Loads starter exercises/templates/settings once. Safe to call on every app start. */
export async function seedIfNeeded(db: NickOnTrackDB): Promise<boolean> {
  return db.transaction('rw', [db.exercises, db.templates, db.settings, db.meta], async () => {
    if (await db.meta.get('seeded')) return false

    const now = Date.now()
    const idByName = new Map<string, string>()
    const exercises: Exercise[] = EXERCISES.map((e) => {
      const id = newId()
      idByName.set(e.name, id)
      return { id, ...e }
    })

    const templates: Template[] = TEMPLATES.map((t, i) => ({
      id: newId(),
      name: t.name,
      note: t.note,
      createdAt: now + i, // keeps seeded order stable
      updatedAt: now + i,
      exercises: t.rows.map(({ exercise, ...rest }, order) => {
        const exerciseId = idByName.get(exercise)
        if (!exerciseId) throw new Error(`Seed references unknown exercise: ${exercise}`)
        return { ...rest, exerciseId, order }
      }),
    }))

    await db.exercises.bulkAdd(exercises)
    await db.templates.bulkAdd(templates)
    if (!(await db.settings.get('settings'))) await db.settings.add(DEFAULT_SETTINGS)
    await db.meta.put({ key: 'seeded', value: now })
    return true
  })
}
