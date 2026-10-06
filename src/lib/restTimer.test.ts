import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { NickOnTrackDB } from '../db/db'
import type { SessionExercise } from '../db/types'
import { adjustRest, getRest, remainingMs, restAfterSet, skipRest, startRest } from './restTimer'

const ex = (order: number, extra: Partial<SessionExercise> = {}, sets = 3): SessionExercise => ({
  exerciseId: `e${order}`,
  order,
  restSeconds: 90,
  sets: Array.from({ length: sets }, (_, index) => ({ index, completed: false })),
  ...extra,
})

describe('timer state', () => {
  it('start, adjust, skip, replace', async () => {
    const db = new NickOnTrackDB(`t-${Math.random()}`)
    await startRest(60, db, 1000)
    expect(await getRest(db)).toEqual({ endsAt: 61000, duration: 60 })
    await adjustRest(15, db, 2000)
    expect(await getRest(db)).toEqual({ endsAt: 76000, duration: 75 })
    await startRest(30, db, 5000) // replaces
    expect((await getRest(db))?.endsAt).toBe(35000)
    await adjustRest(-60, db, 6000) // would end -> cleared
    expect(await getRest(db)).toBeUndefined()
    await startRest(10, db, 0)
    await skipRest(db)
    expect(await getRest(db)).toBeUndefined()
  })

  it('remaining is clock-derived', () => {
    expect(remainingMs({ endsAt: 10_000, duration: 10 }, 4_000)).toBe(6000)
    expect(remainingMs({ endsAt: 10_000, duration: 10 }, 99_000)).toBe(0)
  })
})

describe('restAfterSet', () => {
  it('normal exercise uses its rest, falls back to default', () => {
    const list = [ex(0, { restSeconds: 120 }), ex(1, { restSeconds: 0 })]
    expect(restAfterSet(list, list[0], 0, 90)).toBe(120)
    expect(restAfterSet(list, list[1], 0, 80)).toBe(80)
  })

  it('superset: no timer after the first, timer after the last', () => {
    const list = [ex(0, { supersetGroup: 'A', restSeconds: 0 }), ex(1, { supersetGroup: 'A', restSeconds: 75 })]
    expect(restAfterSet(list, list[0], 1, 90)).toBeNull()
    expect(restAfterSet(list, list[1], 1, 90)).toBe(75)
  })

  it('superset with unequal sets: extra set on the first exercise ends the round', () => {
    // hanging knee raise (3 sets, rest 0) + side plank (2 sets, rest 60)
    const list = [
      ex(0, { supersetGroup: 'E', restSeconds: 0 }, 3),
      ex(1, { supersetGroup: 'E', restSeconds: 60 }, 2),
    ]
    expect(restAfterSet(list, list[0], 0, 90)).toBeNull()
    expect(restAfterSet(list, list[1], 1, 90)).toBe(60)
    expect(restAfterSet(list, list[0], 2, 90)).toBe(60) // falls back to the pair's rest
  })

  it('other exercises do not affect a group', () => {
    const list = [ex(0), ex(1, { supersetGroup: 'A', restSeconds: 0 }), ex(2, { supersetGroup: 'A', restSeconds: 70 })]
    expect(restAfterSet(list, list[1], 0, 90)).toBeNull()
    expect(restAfterSet(list, list[2], 0, 90)).toBe(70)
  })
})
