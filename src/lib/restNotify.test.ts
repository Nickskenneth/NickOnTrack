import { describe, expect, it } from 'vitest'
import { buildScheduleRequest, generateTopic, MIN_DELAY_MS } from './restNotify'

describe('rest notification request', () => {
  it('schedules at the exact end time with a replaceable sequence id', () => {
    const req = buildScheduleRequest('nickontrack-abc', 1_700_000_090_000, 1_700_000_000_000)!
    expect(req.url).toBe('https://ntfy.sh/nickontrack-abc/rest')
    expect((req.init.headers as Record<string, string>)['X-Delay']).toBe('1700000090')
    expect(req.init.method).toBe('POST')
  })
  it('does not schedule when it ends in under 10 seconds', () => {
    expect(buildScheduleRequest('t', 1000 + MIN_DELAY_MS - 1, 1000)).toBeNull()
    expect(buildScheduleRequest('t', 1000 + MIN_DELAY_MS, 1000)).not.toBeNull()
  })
  it('generates private-looking topics', () => {
    const a = generateTopic()
    expect(a).toMatch(/^nickontrack-[a-z0-9]{20}$/)
    expect(generateTopic()).not.toBe(a)
  })
})
