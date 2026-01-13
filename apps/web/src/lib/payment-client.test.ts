import { describe, expect, it, vi } from 'vitest'
import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
  money,
} from '@cafepos/domain'
import { enqueuePayment } from './payment-client'

const session = addPaymentTender(
  createPaymentSession('payment-1', 'order-1', money(12000)),
  { id: 'cash-1', method: 'cash', amount: money(15000) },
)
const { event } = completePayment(session, {
  branchId: 'branch-riverside',
  actorId: 'cashier-1',
  completedAt: '2026-01-13T12:00:00.000Z',
  eventId: 'payment:payment-1:v1',
})

describe('payment client', () => {
  it('posts validated payments with the branch token', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 202 }))
    await enqueuePayment(event, fetcher, 'http://hub.test', 'token')
    expect(fetcher).toHaveBeenCalledWith(
      'http://hub.test/v1/payments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer token' }),
      }),
    )
  })
  it('surfaces hub rejection', async () => {
    await expect(
      enqueuePayment(
        event,
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response(null, { status: 503 })),
        'http://hub.test',
      ),
    ).rejects.toThrow('503')
  })
})
