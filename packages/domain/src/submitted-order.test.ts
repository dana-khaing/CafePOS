import { describe, expect, it } from 'vitest'

import { money } from './money'
import { type DraftOrder } from './order'
import { submitDraftOrder } from './submitted-order'

const draft: DraftOrder = {
  id: 'order-1',
  currency: 'THB',
  diningMode: 'takeaway',
  lines: [
    {
      id: 'line-1',
      itemId: 'latte',
      name: 'Latte',
      quantity: 1,
      unitPrice: money(12000),
      modifiers: [],
      taxRate: { id: 'vat7', name: 'VAT', basisPoints: 700, mode: 'inclusive' },
    },
  ],
}
const context = {
  branchId: 'branch-1',
  actorId: 'cashier-1',
  submittedAt: '2026-01-11T10:00:00.000Z',
  eventId: 'event-1',
}

describe('submitted orders', () => {
  it('freezes a validated draft and emits a versioned sync event', () => {
    const result = submitDraftOrder(draft, context)
    expect(result.order.status).toBe('submitted')
    expect(result.order.totals.gross).toEqual(money(12000))
    expect(result.event).toMatchObject({
      entityType: 'order',
      entityId: 'order-1',
      aggregateVersion: 1,
      payload: { status: 'submitted' },
    })
  })

  it('rejects empty orders and invalid submission context', () => {
    expect(() => submitDraftOrder({ ...draft, lines: [] }, context)).toThrow(
      'empty',
    )
    expect(() =>
      submitDraftOrder(draft, { ...context, branchId: ' ' }),
    ).toThrow('Branch')
    expect(() =>
      submitDraftOrder(draft, { ...context, submittedAt: 'nope' }),
    ).toThrow('time')
  })
})
