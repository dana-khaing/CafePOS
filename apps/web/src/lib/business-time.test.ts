import { describe, expect, it } from 'vitest'
import { businessDayRange, dateInTimezone } from './business-time'

describe('branch business time', () => {
  it('selects today in the configured branch timezone', () => {
    expect(
      dateInTimezone(new Date('2026-01-19T18:30:00Z'), 'Asia/Bangkok'),
    ).toBe('2026-01-20')
  })

  it('builds UTC report boundaries from branch-local midnight', () => {
    expect(businessDayRange('2026-01-20', 'Asia/Bangkok')).toEqual({
      from: '2026-01-19T17:00:00.000Z',
      to: '2026-01-20T17:00:00.000Z',
    })
  })
})
