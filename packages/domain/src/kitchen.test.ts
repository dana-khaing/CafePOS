import { describe, expect, it } from 'vitest'

import { createKitchenTicket, advanceKitchenTicket } from './kitchen'
import { money } from './money'
import { submitDraftOrder } from './submitted-order'

const order = submitDraftOrder(
  {
    id: 'order-1',
    currency: 'THB',
    diningMode: 'table',
    tableNumber: 'A4',
    lines: [
      {
        id: 'line-1',
        itemId: 'latte',
        name: 'Latte',
        quantity: 2,
        unitPrice: money(12000),
        modifiers: [
          { optionId: 'oat', name: 'Oat milk', priceDelta: money(2000) },
        ],
        taxRate: {
          id: 'vat7',
          name: 'VAT',
          basisPoints: 700,
          mode: 'inclusive',
        },
      },
    ],
  },
  {
    branchId: 'branch-1',
    actorId: 'cashier-1',
    submittedAt: '2026-01-12T10:00:00.000Z',
    eventId: 'event-1',
  },
).order

describe('kitchen tickets', () => {
  it('projects preparation details without prices', () => {
    expect(createKitchenTicket(order)).toMatchObject({
      id: 'kitchen:order-1',
      status: 'queued',
      serviceLabel: 'Table A4',
      lines: [{ name: 'Latte', quantity: 2, modifiers: ['Oat milk'] }],
    })
  })

  it('advances in one direction through the kitchen workflow', () => {
    const queued = createKitchenTicket(order)
    const preparing = advanceKitchenTicket(queued, '2026-01-12T10:01:00.000Z')
    const ready = advanceKitchenTicket(preparing, '2026-01-12T10:02:00.000Z')
    const completed = advanceKitchenTicket(ready, '2026-01-12T10:03:00.000Z')
    expect([preparing.status, ready.status, completed.status]).toEqual([
      'preparing',
      'ready',
      'completed',
    ])
    expect(() =>
      advanceKitchenTicket(completed, '2026-01-12T10:04:00.000Z'),
    ).toThrow('Completed')
    expect(() =>
      advanceKitchenTicket(preparing, '2026-01-12T09:00:00.000Z'),
    ).toThrow('backwards')
  })
})
