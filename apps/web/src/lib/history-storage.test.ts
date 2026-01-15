import { describe, expect, it } from 'vitest'
import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
  createReceipt,
  createRefund,
  money,
} from '@cafepos/domain'
import {
  appendReceipt,
  emptyHistory,
  parseSaleHistory,
  serializeSaleHistory,
  settleRefund,
  stageRefund,
} from './history-storage'

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
  { id: 'cash', method: 'cash', amount: money(12000) },
)
const receipt = createReceipt(
  order,
  completePayment(paid, {
    branchId: 'branch-riverside',
    actorId: 'cashier',
    completedAt: '2026-01-15T09:00:00.000Z',
    eventId: 'payment-event',
  }).payment,
)

describe('sale history storage', () => {
  it('moves exact refund events from pending to settled', () => {
    let history = appendReceipt(emptyHistory(), receipt)
    const { event } = createRefund(receipt, [], {
      id: 'refund-1',
      actorId: 'manager',
      actorRole: 'manager',
      reason: 'Request',
      amount: money(5000),
      createdAt: '2026-01-15T10:00:00.000Z',
    })
    history = settleRefund(stageRefund(history, event), event.id)
    expect(history.pendingRefunds).toHaveLength(0)
    expect(history.refunds[0]?.amount).toEqual(money(5000))
    expect(parseSaleHistory(serializeSaleHistory(history))).toEqual(history)
  })
  it('falls back to an empty ledger for corrupt storage', () => {
    expect(parseSaleHistory('{')).toEqual(emptyHistory())
    expect(
      parseSaleHistory(
        JSON.stringify({
          receipts: [receipt],
          refunds: [{ id: 'forged' }],
          pendingRefunds: [],
        }),
      ),
    ).toEqual(emptyHistory())
  })
})
