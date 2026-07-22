import { describe, expect, it } from 'vitest'
import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
  createReceipt,
  money,
} from '@cafepos/domain'
import { parseStoredReceipt, serializeReceipt } from './receipt-storage'

const order = {
  id: 'order-1',
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
        id: 'vat',
        name: 'VAT',
        basisPoints: 700,
        mode: 'inclusive' as const,
      },
    },
  ],
}
const session = addPaymentTender(
  createPaymentSession('payment-1', order.id, money(12000)),
  { id: 'cash-1', method: 'cash', amount: money(12000) },
)
const payment = completePayment(session, {
  branchId: 'branch-riverside',
  actorId: 'cashier-1',
  completedAt: '2026-01-14T12:00:00.000Z',
  eventId: 'event-1',
}).payment

describe('receipt storage', () => {
  it('restores only validated receipts', () => {
    const receipt = createReceipt(order, payment)
    expect(parseStoredReceipt(serializeReceipt(receipt))).toEqual(receipt)
    expect(parseStoredReceipt('{')).toBeNull()
    expect(
      parseStoredReceipt(JSON.stringify({ ...receipt, branchId: 'forged' })),
    ).toBeNull()
  })
})
