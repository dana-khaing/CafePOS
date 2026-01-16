import { describe, expect, it } from 'vitest'
import {
  addPaymentTender,
  completePayment,
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
    expect(parseShiftLedger('{').current).toBeNull()
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
    ledger = recordCashRefund(ledger, refund)
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
})
