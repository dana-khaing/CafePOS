import { describe, expect, it } from 'vitest'
import { money } from './money'
import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
} from './payment'
import { createReceipt } from './receipt'
import { createRefund, refundedTotal, validateRefundEvent } from './refund'

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
const paid = addPaymentTender(
  createPaymentSession('payment-1', order.id, money(12000)),
  { id: 'cash-1', method: 'cash', amount: money(12000) },
)
const receipt = createReceipt(
  order,
  completePayment(paid, {
    branchId: 'branch-riverside',
    actorId: 'cashier-1',
    completedAt: '2026-01-15T09:00:00.000Z',
    eventId: 'payment-event',
  }).payment,
)

describe('refunds', () => {
  it('supports cumulative partial and full refunds', () => {
    const first = createRefund(receipt, [], {
      id: 'refund-1',
      actorId: 'manager-1',
      actorRole: 'manager',
      reason: 'Customer request',
      amount: money(5000),
      createdAt: '2026-01-15T10:00:00.000Z',
    })
    const second = createRefund(receipt, [first.refund], {
      id: 'refund-2',
      actorId: 'manager-1',
      actorRole: 'manager',
      reason: 'Remaining balance',
      amount: money(7000),
      createdAt: '2026-01-15T11:00:00.000Z',
    })
    expect(refundedTotal([first.refund, second.refund], 'THB')).toEqual(
      money(12000),
    )
    expect(validateRefundEvent(first.event)).toEqual(first.refund)
  })
  it('rejects over-refunds, currency changes, and forged envelopes', () => {
    expect(() =>
      createRefund(receipt, [], {
        id: 'refund-1',
        actorId: 'manager-1',
        actorRole: 'manager',
        reason: 'Too much',
        amount: money(12001),
        createdAt: '2026-01-15T10:00:00.000Z',
      }),
    ).toThrow('exceeds')
    expect(() =>
      createRefund(receipt, [], {
        id: 'refund-1',
        actorId: 'manager-1',
        actorRole: 'manager',
        reason: 'Wrong',
        amount: money(1, 'MMK'),
        createdAt: '2026-01-15T10:00:00.000Z',
      }),
    ).toThrow('currency')
    const result = createRefund(receipt, [], {
      id: 'refund-1',
      actorId: 'manager-1',
      actorRole: 'manager',
      reason: 'Request',
      amount: money(1000),
      createdAt: '2026-01-15T10:00:00.000Z',
    })
    expect(() =>
      validateRefundEvent({ ...result.event, branchId: 'other' }),
    ).toThrow('envelope')
    expect(() =>
      createRefund(receipt, [], {
        id: 'refund-2',
        actorId: 'cashier-1',
        actorRole: 'cashier',
        reason: 'Unauthorized',
        amount: money(100),
        createdAt: '2026-01-15T10:00:00.000Z',
      }),
    ).toThrow('authorized')
  })
})
