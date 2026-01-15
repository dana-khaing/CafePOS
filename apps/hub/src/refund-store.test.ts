import { describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
  createReceipt,
  createRefund,
  money,
} from '@cafepos/domain'
import { FileRefundStore } from './refund-store'

const order = {
  id: 'order-1',
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

describe('refund journal', () => {
  it('enforces cumulative limits even when commands omit prior refunds', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cafepos-refund-store-'))
    const store = new FileRefundStore(join(directory, 'refunds.json'))
    const first = createRefund(receipt, [], {
      id: 'one',
      actorId: 'manager',
      actorRole: 'manager',
      reason: 'First',
      amount: money(7000),
      createdAt: '2026-01-15T10:00:00.000Z',
    })
    const forgedSecond = createRefund(receipt, [], {
      id: 'two',
      actorId: 'manager',
      actorRole: 'manager',
      reason: 'Second',
      amount: money(6000),
      createdAt: '2026-01-15T11:00:00.000Z',
    })
    await store.accept(receipt, first.event)
    await expect(store.accept(receipt, first.event)).resolves.toEqual(
      first.refund,
    )
    await expect(store.accept(receipt, forgedSecond.event)).rejects.toThrow(
      'exceeds',
    )
    await expect(
      store.accept(
        {
          ...receipt,
          order: {
            ...receipt.order,
            lines: receipt.order.lines.map((line) => ({
              ...line,
              name: 'Collision',
            })),
          },
        },
        first.event,
      ),
    ).rejects.toThrow('collision')
  })
})
