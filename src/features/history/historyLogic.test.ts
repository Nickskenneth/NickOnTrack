import { describe, expect, it } from 'vitest'
import type { Session } from '../../db/types'
import { formatDuration, formatVolume, sessionVolumeKg, setsSummary } from './historyLogic'

const session: Session = {
  id: 's',
  name: 'Test',
  startedAt: 0,
  finishedAt: 3_900_000,
  exercises: [
    {
      exerciseId: 'a',
      order: 0,
      restSeconds: 90,
      sets: [
        { index: 0, weight: 100, reps: 5, completed: true },
        { index: 1, weight: 100, reps: 5, completed: false }, // not counted
      ],
    },
    {
      exerciseId: 'b',
      order: 1,
      restSeconds: 60,
      isTimed: true,
      sets: [{ index: 0, weight: 20, reps: 30, completed: true }], // timed: not counted
    },
    { exerciseId: 'c', order: 2, restSeconds: 60, sets: [{ index: 0, reps: 10, completed: true }] }, // bodyweight
  ],
}

describe('history', () => {
  it('volume counts completed weighted non-timed sets only', () => {
    expect(sessionVolumeKg(session)).toBe(500)
    expect(formatVolume(500, 'kg')).toBe('500 kg')
  })
  it('formats duration', () => {
    expect(formatDuration(3_900_000)).toBe('1h 05m')
    expect(formatDuration(2_520_000)).toBe('42m')
  })
  it('summarises sets', () => {
    expect(setsSummary(session.exercises[0], 'kg')).toBe('100kg × 5')
    expect(setsSummary(session.exercises[1], 'kg')).toBe('30s')
    expect(setsSummary(session.exercises[2], 'kg')).toBe('10 reps')
    expect(setsSummary({ ...session.exercises[0], sets: [] }, 'kg')).toBe('No completed sets')
  })
})
