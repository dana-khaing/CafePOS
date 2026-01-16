import { describe, expect, it } from 'vitest'
import {
  addPaymentTender,
  completePayment,
  closeCashShift,
  createPaymentSession,
  createReceipt,
  createRefund,
  money,
  openCashShift,
} from '@cafepos/domain'
import {
  parseShiftLedger,
  recordCashRefund,
  recordCashSale,
  serializeShiftLedger,
} from './shift-storage'
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
    expect(() => parseShiftLedger('{')).toThrow()
  })
  it('records cash receipts and refunds idempotently', () => {
    const current = openCashShift({
      id: 'shift',
      branchId: 'branch-riverside',
      actorId: 'manager',
      actorRole: 'manager',
      openedAt: '2026-01-16T08:00:00Z',
      openingFloat: money(50000),
    })
    const order = {
      id: 'order',
      currency: 'THB' as const,
      diningMode: 'counter' as const,
      lines: [
        {
          id: 'line',
          itemId: 'latte',
          name: 'Latte',
          quantity: 1,
          unitPrice: money(12000),
          modifiers: [],
          taxRate: {
            id: 'vat',
            name: 'VAT',
            basisPoints: 700,
            mode: 'inclusive' as const,
          },
        },
      ],
    }
    const paid = addPaymentTender(
      createPaymentSession('payment', order.id, money(12000)),
      { id: 'cash', method: 'cash', amount: money(15000) },
    )
    const receipt = createReceipt(
      order,
      completePayment(paid, {
        branchId: 'branch-riverside',
        actorId: 'cashier',
        completedAt: '2026-01-16T09:00:00Z',
        eventId: 'event',
      }).payment,
    )
    let ledger = recordCashSale({ current, archive: [] }, receipt)
    ledger = recordCashSale(ledger, receipt)
    const refund = createRefund(receipt, [], {
      id: 'refund',
      actorId: 'manager',
      actorRole: 'manager',
      reason: 'Return',
      amount: money(2000),
      createdAt: '2026-01-16T10:00:00Z',
    }).refund
    ledger = recordCashRefund(ledger, receipt, refund)
    expect(
      ledger.current?.movements.map((entry) => [
        entry.type,
        entry.amount.minor,
      ]),
    ).toEqual([
      ['sale', 12000],
      ['refund', 2000],
    ])
  })
  it('does not remove card-only receipts from the cash drawer', () => {
    const current = openCashShift({
      id: 'shift',
      branchId: 'branch-riverside',
      actorId: 'manager',
      actorRole: 'manager',
      openedAt: '2026-01-16T08:00:00Z',
      openingFloat: money(50000),
    })
    const order = {
      id: 'card-order',
      currency: 'THB' as const,
      diningMode: 'counter' as const,
      lines: [
        {
          id: 'line',
          itemId: 'latte',
          name: 'Latte',
          quantity: 1,
          unitPrice: money(12000),
          modifiers: [],
          taxRate: {
            id: 'vat',
            name: 'VAT',
            basisPoints: 700,
            mode: 'inclusive' as const,
          },
        },
      ],
    }
    const paid = addPaymentTender(
      createPaymentSession('card-payment', order.id, money(12000)),
      {
        id: 'card',
        method: 'card',
        amount: money(12000),
      },
    )
    const receipt = createReceipt(
      order,
      completePayment(paid, {
        branchId: 'branch-riverside',
        actorId: 'cashier',
        completedAt: '2026-01-16T09:00:00Z',
        eventId: 'card-event',
      }).payment,
    )
    const refund = createRefund(receipt, [], {
      id: 'card-refund',
      actorId: 'manager',
      actorRole: 'manager',
      reason: 'Return',
      amount: money(2000),
      createdAt: '2026-01-16T10:00:00Z',
    }).refund
    expect(
      recordCashRefund({ current, archive: [] }, receipt, refund).current
        ?.movements,
    ).toEqual([])
  })
  it('caps mixed-tender cash refunds across archived shifts', () => {
    const firstShift = openCashShift({
      id: 'first',
      branchId: 'branch-riverside',
      actorId: 'manager',
      actorRole: 'manager',
      openedAt: '2026-01-16T08:00:00Z',
      openingFloat: money(50000),
    })
    const order = {
      id: 'mixed-order',
      currency: 'THB' as const,
      diningMode: 'counter' as const,
      lines: [
        {
          id: 'line',
          itemId: 'latte',
          name: 'Latte',
          quantity: 1,
          unitPrice: money(12000),
          modifiers: [],
          taxRate: {
            id: 'vat',
            name: 'VAT',
            basisPoints: 700,
            mode: 'inclusive' as const,
          },
        },
      ],
    }
    let payment = createPaymentSession('mixed-payment', order.id, money(12000))
    payment = addPaymentTender(payment, {
      id: 'cash',
      method: 'cash',
      amount: money(5000),
    })
    payment = addPaymentTender(payment, {
      id: 'card',
      method: 'card',
      amount: money(7000),
    })
    const receipt = createReceipt(
      order,
      completePayment(payment, {
        branchId: 'branch-riverside',
        actorId: 'cashier',
        completedAt: '2026-01-16T09:00:00Z',
        eventId: 'mixed-event',
      }).payment,
    )
    const firstRefund = createRefund(receipt, [], {
      id: 'refund-one',
      actorId: 'manager',
      actorRole: 'manager',
      reason: 'First',
      amount: money(2000),
      createdAt: '2026-01-16T10:00:00Z',
    }).refund
    let ledger = recordCashRefund(
      { current: firstShift, archive: [] },
      receipt,
      firstRefund,
    )
    const closed = closeCashShift(ledger.current!, {
      actorId: 'manager',
      actorRole: 'manager',
      closedAt: '2026-01-16T11:00:00Z',
      countedCash: money(48000),
    })
    const secondShift = openCashShift({
      id: 'second',
      branchId: 'branch-riverside',
      actorId: 'manager',
      actorRole: 'manager',
      openedAt: '2026-01-16T12:00:00Z',
      openingFloat: money(50000),
    })
    const secondRefund = createRefund(receipt, [firstRefund], {
      id: 'refund-two',
      actorId: 'manager',
      actorRole: 'manager',
      reason: 'Second',
      amount: money(4000),
      createdAt: '2026-01-16T13:00:00Z',
    }).refund
    ledger = recordCashRefund(
      { current: secondShift, archive: [closed] },
      receipt,
      secondRefund,
    )
    expect(ledger.current?.movements[0]?.amount).toEqual(money(3000))
  })
})
