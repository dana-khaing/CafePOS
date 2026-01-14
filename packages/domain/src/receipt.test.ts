import { describe, expect, it } from 'vitest'
import { money } from './money'
import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
} from './payment'
import { createReceipt, validateReceipt } from './receipt'

const order = {
  id: 'order-12345678',
  currency: 'THB' as const,
  diningMode: 'counter' as const,
  lines: [
    {
      id: 'line-1',
      itemId: 'latte',
      name: 'Latte',
      quantity: 1,
      unitPrice: money(12000),
      modifiers: [],
      taxRate: {
        id: 'vat7',
        name: 'VAT 7%',
        basisPoints: 700,
        mode: 'inclusive' as const,
      },
    },
  ],
}
const session = addPaymentTender(
  createPaymentSession('payment-1', order.id, money(12000)),
  { id: 'cash-1', method: 'cash', amount: money(15000) },
)
const payment = completePayment(session, {
  branchId: 'branch-riverside',
  actorId: 'cashier-1',
  completedAt: '2026-01-14T10:00:00.000Z',
  eventId: 'payment-event-1',
}).payment

describe('receipt', () => {
  it('creates a deterministic validated receipt with payment details', () => {
    const receipt = createReceipt(order, payment)
    expect(receipt.number).toBe('R-20260114-12345678')
    expect(receipt.payment.summary.change).toEqual(money(3000))
    expect(validateReceipt(receipt)).toEqual(receipt)
  })

  it('rejects mismatched totals, orders, and issuers', () => {
    const receipt = createReceipt(order, payment)
    expect(() =>
      validateReceipt({
        ...receipt,
        totals: { ...receipt.totals, gross: money(1) },
      }),
    ).toThrow('totals')
    expect(() => validateReceipt({ ...receipt, branchId: 'other' })).toThrow(
      'match',
    )
    expect(() =>
      createReceipt({ ...order, id: 'other-order' }, payment),
    ).toThrow('match')
  })
})
