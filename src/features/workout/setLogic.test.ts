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
