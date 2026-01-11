import { describe, expect, it, vi } from 'vitest'

import { type SyncEvent } from '@cafepos/domain'

import { enqueueSubmittedOrder } from './order-submission'

const event: SyncEvent = {
  id: 'event-1',
  schemaVersion: 1,
  branchId: 'branch-riverside',
  actorId: 'cashier-1',
  entityType: 'order',
  entityId: 'order-1',
  aggregateVersion: 1,
  operation: 'upsert',
  occurredAt: '2026-01-11T12:00:00.000Z',
  payload: { status: 'submitted' },
}

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
})
