import { describe, expect, it } from 'vitest'
import { money, openCashShift } from '@cafepos/domain'
import { parseShiftLedger, serializeShiftLedger } from './shift-storage'
describe('shift storage', () => {
  it('round trips validated open shifts and rejects corruption', () => {
    const current = openCashShift({
      id: 'shift',
      branchId: 'branch',
      actorId: 'manager',
      actorRole: 'manager',
      openedAt: '2026-01-16T08:00:00Z',
      openingFloat: money(50000),
    })
    const ledger = { current, archive: [] }
    expect(parseShiftLedger(serializeShiftLedger(ledger))).toEqual(ledger)
    expect(parseShiftLedger('{').current).toBeNull()
  })
})
