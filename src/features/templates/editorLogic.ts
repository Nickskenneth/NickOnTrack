import { newId } from '../../lib/id'
import type { Template, TemplateExercise } from '../../db/types'

// Pure helpers for editing a template's exercise list. The UI keeps a draft
// array of rows and applies these; nothing here touches the database.

const FALLBACK_REST = 75
const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function reindex(rows: TemplateExercise[]): TemplateExercise[] {
  return rows.map((r, order) => ({ ...r, order }))
}

/**
 * Keeps superset data consistent:
 * - a "group" needs 2+ adjacent members (singletons lose the group)
 * - groups are relabelled A, B, C... in order
 * - rest lives on the LAST member; earlier members carry 0
 * - rows that should have rest but have 0 get a sensible fallback
 */
export function normalizeSupersets(input: TemplateExercise[]): TemplateExercise[] {
  const rows = reindex(input).map((r) => ({ ...r }))
  let label = 0
  let i = 0
  while (i < rows.length) {
    const g = rows[i].supersetGroup
    let j = i + 1
    if (g) while (j < rows.length && rows[j].supersetGroup === g) j++
    if (g && j - i >= 2) {
      const name = LABELS[label++ % LABELS.length]
      for (let k = i; k < j; k++) {
        rows[k].supersetGroup = name
        if (k < j - 1) rows[k].restSeconds = 0
      }
      if (rows[j - 1].restSeconds === 0) rows[j - 1].restSeconds = FALLBACK_REST
    } else {
      for (let k = i; k < j; k++) {
        delete rows[k].supersetGroup
        if (rows[k].restSeconds === 0) rows[k].restSeconds = FALLBACK_REST
      }
    }
    i = j
  }
  return rows
}

export function moveRow(rows: TemplateExercise[], index: number, dir: -1 | 1): TemplateExercise[] {
  const to = index + dir
  if (to < 0 || to >= rows.length) return rows
  const next = [...rows]
  ;[next[index], next[to]] = [next[to], next[index]]
  return normalizeSupersets(next)
}

export function addRow(
  rows: TemplateExercise[],
  exerciseId: string,
  defaultRestSeconds: number,
): TemplateExercise[] {
  return normalizeSupersets([
    ...rows,
    { exerciseId, sets: 3, repMin: 8, repMax: 12, restSeconds: defaultRestSeconds, order: rows.length },
  ])
}

/** Substitute the exercise, keeping sets/reps/rest/superset so the slot keeps its role. */
export function replaceExercise(
  rows: TemplateExercise[],
  index: number,
  exerciseId: string,
): TemplateExercise[] {
  return rows.map((r, i) => (i === index ? { ...r, exerciseId } : r))
}

export function updateRow(
  rows: TemplateExercise[],
  index: number,
  patch: Partial<TemplateExercise>,
): TemplateExercise[] {
  return rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
}

export function removeRow(rows: TemplateExercise[], index: number): TemplateExercise[] {
  return normalizeSupersets(rows.filter((_, i) => i !== index))
}

/** Put rows `index` and `index + 1` in the same superset (merging groups if needed). */
export function linkWithNext(rows: TemplateExercise[], index: number): TemplateExercise[] {
  if (index < 0 || index >= rows.length - 1) return rows
  const next = rows.map((r) => ({ ...r }))
  const a = next[index]
  const b = next[index + 1]
  const target = a.supersetGroup ?? b.supersetGroup ?? `new-${newId()}`
  const old = b.supersetGroup
  a.supersetGroup = target
  b.supersetGroup = target
  if (old && old !== target) {
    for (const r of next) if (r.supersetGroup === old) r.supersetGroup = target
  }
  return normalizeSupersets(next)
}

/** Split the superset between rows `index` and `index + 1`. */
export function unlinkFromNext(rows: TemplateExercise[], index: number): TemplateExercise[] {
  const g = rows[index]?.supersetGroup
  if (!g || rows[index + 1]?.supersetGroup !== g) return rows
  const tail = `split-${newId()}`
  const next = rows.map((r, i) =>
    i > index && r.supersetGroup === g ? { ...r, supersetGroup: tail } : { ...r },
  )
  return normalizeSupersets(next)
}

export function blankTemplate(): Template {
  const now = Date.now()
  return { id: newId(), name: '', exercises: [], createdAt: now, updatedAt: now }
}

export function duplicateTemplate(t: Template): Template {
  const now = Date.now()
  return {
    ...t,
    id: newId(),
    name: `${t.name} (copy)`,
    exercises: t.exercises.map((e) => ({ ...e })),
    createdAt: now,
    updatedAt: now,
  }
}

export function validateTemplate(t: Template): string | null {
  if (!t.name.trim()) return 'Give the template a name.'
  if (t.exercises.length === 0) return 'Add at least one exercise.'
  for (const e of t.exercises) {
    if (!(e.sets >= 1)) return 'Each exercise needs at least 1 set.'
    if (!(e.restSeconds >= 0)) return 'Rest time cannot be empty.'
    if (!(e.repMin >= 1) || !(e.repMax >= e.repMin)) return 'Check rep ranges (max must be at least min).'
  }
  return null
}
