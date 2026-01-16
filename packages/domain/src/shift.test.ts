import { describe, expect, it } from 'vitest'
import { money } from './money'
import {
  addCashMovement,
  closeCashShift,
  expectedDrawerCash,
  openCashShift,
  validateCashShift,
} from './shift'

describe('cash shifts', () => {
  it('reconciles float, cash sales, refunds, and movements', () => {
    let shift = openCashShift({
      id: 'shift-1',
      branchId: 'branch-1',
      actorId: 'manager',
      actorRole: 'manager',
      openedAt: '2026-01-16T08:00:00.000Z',
      openingFloat: money(50000),
    })
    shift = addCashMovement(shift, {
      id: 'sale-1',
      type: 'sale',
      amount: money(12000),
      reason: 'Receipt R1',
      occurredAt: '2026-01-16T09:00:00.000Z',
    })
    shift = addCashMovement(shift, {
      id: 'refund-1',
      type: 'refund',
      amount: money(2000),
      reason: 'Refund R1',
      occurredAt: '2026-01-16T10:00:00.000Z',
    })
    expect(expectedDrawerCash(shift)).toEqual(money(60000))
    const closed = closeCashShift(shift, {
      actorId: 'manager',
      actorRole: 'manager',
      closedAt: '2026-01-16T18:00:00.000Z',
      countedCash: money(59800),
    })
    expect(closed.variance).toEqual(money(-200))
    expect(validateCashShift(closed)).toEqual(closed)
  })
  it('rejects cashier approval, duplicate movements, and forged close totals', () => {
    expect(() =>
      openCashShift({
        id: 'shift',
        branchId: 'branch',
        actorId: 'cashier',
        actorRole: 'cashier',
        openedAt: '2026-01-16T08:00:00Z',
        openingFloat: money(0),
      }),
    ).toThrow('manager')
    const shift = openCashShift({
      id: 'shift',
      branchId: 'branch',
      actorId: 'manager',
      actorRole: 'manager',
      openedAt: '2026-01-16T08:00:00Z',
      openingFloat: money(0),
    })
    const moved = addCashMovement(shift, {
      id: 'one',
      type: 'paid-in',
      amount: money(100),
      reason: 'Float',
      occurredAt: '2026-01-16T09:00:00Z',
    })
    expect(() => addCashMovement(moved, moved.movements[0]!)).toThrow('unique')
    const closed = closeCashShift(moved, {
      actorId: 'manager',
      actorRole: 'manager',
      closedAt: '2026-01-16T10:00:00Z',
      countedCash: money(100),
    })
    expect(() => validateCashShift({ ...closed, variance: money(1) })).toThrow(
      'totals',
    )
  })
  it('enforces chronology, status, and closing money invariants', () => {
    const shift = openCashShift({
      id: 'shift',
      branchId: 'branch',
      actorId: 'manager',
      actorRole: 'manager',
      openedAt: '2026-01-16T08:00:00Z',
      openingFloat: money(100),
    })
    expect(() =>
      addCashMovement(shift, {
        id: 'early',
        type: 'paid-in',
        amount: money(1),
        reason: 'Early',
        occurredAt: '2026-01-16T07:00:00Z',
      }),
    ).toThrow('chronological')
    const moved = addCashMovement(shift, {
      id: 'later',
      type: 'paid-in',
      amount: money(1),
      reason: 'Later',
      occurredAt: '2026-01-16T10:00:00Z',
    })
    expect(() =>
      closeCashShift(moved, {
        actorId: 'manager',
        actorRole: 'manager',
        closedAt: '2026-01-16T09:00:00Z',
        countedCash: money(101),
      }),
    ).toThrow('details')
    expect(() =>
      validateCashShift({ ...shift, status: 'garbage' as 'open' }),
    ).toThrow('status')
    const closed = closeCashShift(moved, {
      actorId: 'manager',
      actorRole: 'manager',
      closedAt: '2026-01-16T11:00:00Z',
      countedCash: money(101),
    })
    expect(() =>
      validateCashShift({ ...closed, countedCash: money(101, 'MMK') }),
    ).toThrow('details')
  })
})
