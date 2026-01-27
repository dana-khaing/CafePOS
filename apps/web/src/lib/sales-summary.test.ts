import { describe, expect, it } from 'vitest'

import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
} from '@cafepos/domain'
import { createReceipt } from '@cafepos/domain'

import { emptyHistory, appendReceipt } from './history-storage'
import { buildWeeklySalesComparison } from './sales-summary'

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
      unitPrice: { currency: 'THB' as const, minor: 12000 },
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

const paidReceipt = (id: string, completedAt: string, cashMinor: number) => {
  let session = createPaymentSession(`payment:${id}`, order.id, {
    currency: 'THB',
    minor: 12000,
  })
  session = addPaymentTender(session, {
    id: `tender:${id}`,
    method: 'cash',
    amount: { currency: 'THB', minor: cashMinor },
  })
  return createReceipt(
    order,
    completePayment(session, {
      branchId: 'branch',
      actorId: 'cashier',
      completedAt,
      eventId: `event:${id}`,
    }).payment,
  )
}

describe('weekly sales comparison', () => {
  it('compares the current business day with the same day last week', () => {
    const current = paidReceipt(
      'current',
      '2026-01-27T10:00:00.000Z',
      15000,
    )
    const previous = paidReceipt(
      'previous',
      '2026-01-20T10:00:00.000Z',
      14000,
    )
    const history = appendReceipt(appendReceipt(emptyHistory(), current), previous)
    const summary = buildWeeklySalesComparison(
      history,
      '2026-01-27',
      'Asia/Bangkok',
    )
    expect(summary.current.orderCount).toBe(1)
    expect(summary.previous.orderCount).toBe(1)
    expect(summary.differenceMinor).toBe(0)
    expect(summary.percentChange).toBe(0)
  })

  it('returns no percentage when there is no comparison baseline', () => {
    const current = paidReceipt('current', '2026-01-27T10:00:00.000Z', 15000)
    const summary = buildWeeklySalesComparison(
      appendReceipt(emptyHistory(), current),
      '2026-01-27',
      'Asia/Bangkok',
    )
    expect(summary.previous.orderCount).toBe(0)
    expect(summary.percentChange).toBeNull()
  })
})
