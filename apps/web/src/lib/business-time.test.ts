import { describe, expect, it } from 'vitest'
import {
  businessDayRange,
  dateInTimezone,
  shiftBusinessDate,
} from './business-time'

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

  it('shifts business dates across week boundaries', () => {
    expect(shiftBusinessDate('2026-01-27', -7)).toBe('2026-01-20')
    expect(shiftBusinessDate('2026-02-01', -1)).toBe('2026-01-31')
  })
})
