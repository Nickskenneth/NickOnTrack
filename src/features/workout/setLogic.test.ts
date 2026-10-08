import { describe, expect, it } from 'vitest'
import { formatElapsed, previousLabel, resolveCompletion } from './setLogic'
import { formatWeight, fromDisplay, parseNumber, toDisplay } from '../../lib/units'

const set = (extra = {}) => ({ index: 0, completed: false, ...extra })

describe('resolveCompletion', () => {
  it('uses typed values', () => {
    expect(resolveCompletion(set({ weight: 50, reps: 5 }), set({ weight: 40, reps: 8 }))).toEqual({ ok: true, weight: 50, reps: 5 })
  })
  it('falls back to the placeholder', () => {
    expect(resolveCompletion(set(), set({ weight: 40, reps: 8 }))).toEqual({ ok: true, weight: 40, reps: 8 })
  })
  it('requires reps', () => {
    expect(resolveCompletion(set({ weight: 40 }))).toEqual({ ok: false })
  })
  it('allows bodyweight (no weight)', () => {
    expect(resolveCompletion(set({ reps: 8 }))).toEqual({ ok: true, weight: undefined, reps: 8 })
  })
})

describe('labels and units', () => {
  it('previous label', () => {
    expect(previousLabel(set({ weight: 42.5, reps: 8 }), 'kg')).toBe('42.5kg × 8')
    expect(previousLabel(set({ reps: 10 }), 'kg')).toBe('10 reps')
    expect(previousLabel(set({ reps: 30 }), 'kg', true)).toBe('30s')
    expect(previousLabel(undefined, 'kg')).toBe('–')
  })
  it('lb round trip', () => {
    expect(toDisplay(fromDisplay(135, 'lb'), 'lb')).toBe(135)
    expect(formatWeight(60, 'kg')).toBe('60')
  })
  it('parses input', () => {
    expect(parseNumber('42,5')).toBe(42.5)
    expect(parseNumber('')).toBeUndefined()
    expect(parseNumber('abc')).toBeUndefined()
  })
  it('elapsed', () => {
    expect(formatElapsed(65_000)).toBe('1:05')
    expect(formatElapsed(3_725_000)).toBe('1:02:05')
  })
})

import { parseSum } from '../../lib/units'
import { formatRest, parseRestSeconds } from '../../lib/duration'

describe('sums and rest input', () => {
  it('adds typed parts', () => {
    expect(parseSum('20+2.5')).toBe(22.5)
    expect(parseSum('20+2.5+1,25')).toBe(23.75)
    expect(parseSum('0.1+0.2')).toBe(0.3)
  })
  it('ignores a trailing plus, rejects garbage', () => {
    expect(parseSum('20+')).toBe(20)
    expect(parseSum('+')).toBeUndefined()
    expect(parseSum('')).toBeUndefined()
    expect(parseSum('20+abc')).toBeUndefined()
  })
  it('rest seconds', () => {
    expect(formatRest(150)).toBe('2:30')
    expect(formatRest(75)).toBe('1:15')
    expect(parseRestSeconds('150')).toBe(150)
    expect(parseRestSeconds('4')).toBeUndefined()
    expect(parseRestSeconds('99999')).toBeUndefined()
    expect(parseRestSeconds('1.5')).toBeUndefined()
    expect(parseRestSeconds('')).toBeUndefined()
  })
})
