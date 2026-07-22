import { describe, expect, it, vi } from 'vitest'

import { money, submitDraftOrder } from '@cafepos/domain'

import {
  enqueueSubmittedOrder,
  parsePendingOrderSubmission,
  serializePendingOrderSubmission,
} from './order-submission'

const { event } = submitDraftOrder(
  {
    id: 'order-1',
    currency: 'THB',
    diningMode: 'counter',
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
          name: 'VAT',
          basisPoints: 700,
          mode: 'inclusive',
        },
      },
    ],
  },
  {
    branchId: 'branch-riverside',
    actorId: 'cashier-1',
    submittedAt: '2026-01-11T12:00:00.000Z',
    eventId: 'event-1',
  },
)

describe('order submission client', () => {
  it('posts a validated event to the branch hub', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 202 }))
    await enqueueSubmittedOrder(
      event,
      fetcher,
      'http://hub.test',
      'device-token',
    )
    expect(fetcher).toHaveBeenCalledWith(
      'http://hub.test/v1/orders',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(event),
        headers: expect.objectContaining({
          authorization: 'Bearer device-token',
        }),
      }),
    )
  })

  it('keeps rejection visible to the cashier', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 503 }))
    await expect(
      enqueueSubmittedOrder(event, fetcher, 'http://hub.test'),
    ).rejects.toThrow('503')
  })

  it('persists and restores the exact validated pending event', () => {
    expect(
      parsePendingOrderSubmission(serializePendingOrderSubmission(event)),
    ).toEqual(event)
    expect(parsePendingOrderSubmission('{')).toBeNull()
    expect(
      parsePendingOrderSubmission(
        JSON.stringify({ ...event, payload: { status: 'submitted' } }),
      ),
    ).toBeNull()
  })
})
