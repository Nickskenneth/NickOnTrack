import { describe, expect, it } from 'vitest'
import type { TemplateExercise } from '../../db/types'
import {
  addRow,
  linkWithNext,
  moveRow,
  normalizeSupersets,
  removeRow,
  replaceExercise,
  unlinkFromNext,
  validateTemplate,
} from './editorLogic'

const row = (exerciseId: string, extra: Partial<TemplateExercise> = {}): TemplateExercise => ({
  exerciseId,
  sets: 3,
  repMin: 8,
  repMax: 12,
  restSeconds: 90,
  order: 0,
  ...extra,
})
const ids = (rows: TemplateExercise[]) => rows.map((r) => r.exerciseId)

describe('supersets', () => {
  it('links two rows: group label, rest on last only', () => {
    const rows = linkWithNext([row('a'), row('b', { restSeconds: 75 }), row('c')], 0)
    expect(rows.map((r) => r.supersetGroup)).toEqual(['A', 'A', undefined])
    expect(rows.map((r) => r.restSeconds)).toEqual([0, 75, 90])
  })

  it('extends a group and merges adjacent groups', () => {
    let rows = linkWithNext([row('a'), row('b'), row('c'), row('d')], 0)
    rows = linkWithNext(rows, 2)
    expect(rows.map((r) => r.supersetGroup)).toEqual(['A', 'A', 'B', 'B'])
    rows = linkWithNext(rows, 1)
    expect(rows.map((r) => r.supersetGroup)).toEqual(['A', 'A', 'A', 'A'])
  })

  it('unlink splits and restores rest on the freed row', () => {
    const linked = linkWithNext([row('a'), row('b', { restSeconds: 60 })], 0)
    const rows = unlinkFromNext(linked, 0)
    expect(rows.map((r) => r.supersetGroup)).toEqual([undefined, undefined])
    expect(rows[0].restSeconds).toBe(75)
    expect(rows[1].restSeconds).toBe(60)
  })

  it('removing a member dissolves a pair', () => {
    const rows = removeRow(linkWithNext([row('a'), row('b'), row('c')], 0), 1)
    expect(ids(rows)).toEqual(['a', 'c'])
    expect(rows.every((r) => !r.supersetGroup)).toBe(true)
  })

  it('moving a row out of its pair dissolves it', () => {
    const linked = linkWithNext([row('a'), row('b'), row('c')], 0)
    const rows = moveRow(linked, 0, 1) // b, a, c -> still adjacent pair
    expect(rows.map((r) => r.supersetGroup)).toEqual(['A', 'A', undefined])
    const out = moveRow(rows, 1, 1) // b, c, a -> pair split
    expect(out.every((r) => !r.supersetGroup)).toBe(true)
  })

  it('relabels groups in order', () => {
    const rows = normalizeSupersets([
      row('a', { supersetGroup: 'Z', restSeconds: 0 }),
      row('b', { supersetGroup: 'Z' }),
      row('c', { supersetGroup: 'Q', restSeconds: 0 }),
      row('d', { supersetGroup: 'Q' }),
    ])
    expect(rows.map((r) => r.supersetGroup)).toEqual(['A', 'A', 'B', 'B'])
  })
})

describe('editing', () => {
  it('replace keeps the slot settings', () => {
    const rows = replaceExercise([row('a', { sets: 4, restSeconds: 120 })], 0, 'z')
    expect(rows[0]).toMatchObject({ exerciseId: 'z', sets: 4, restSeconds: 120 })
  })

  it('add uses default rest and appends', () => {
    const rows = addRow([row('a')], 'b', 60)
    expect(rows[1]).toMatchObject({ exerciseId: 'b', restSeconds: 60, order: 1 })
  })

  it('validates', () => {
    const t = { id: 'x', name: ' ', exercises: [], createdAt: 0, updatedAt: 0 }
    expect(validateTemplate(t)).toMatch(/name/)
    expect(validateTemplate({ ...t, name: 'T' })).toMatch(/exercise/)
    expect(validateTemplate({ ...t, name: 'T', exercises: [row('a', { repMin: 10, repMax: 5 })] })).toMatch(/rep/)
    expect(validateTemplate({ ...t, name: 'T', exercises: [row('a')] })).toBeNull()
  })
})
