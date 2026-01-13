import { describe, expect, it } from 'vitest'
import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
  money,
} from '@cafepos/domain'
import {
  parsePendingPaymentEvent,
  parseStoredPayment,
  serializePayment,
  serializePendingPaymentEvent,
} from './payment-storage'

describe('payment storage', () => {
  it('round trips validated pending payments and rejects forged data', () => {
    const payment = createPaymentSession('payment-1', 'order-1', money(12000))
    expect(parseStoredPayment(serializePayment(payment))).toEqual(payment)
    expect(parseStoredPayment('{')).toBeNull()
    expect(
      parseStoredPayment(JSON.stringify({ ...payment, status: 'paid' })),
    ).toBeNull()
  })

  it('round trips the exact completed event used for ambiguous retries', () => {
    const paid = addPaymentTender(
      createPaymentSession('payment-1', 'order-1', money(12000)),
      { id: 'cash-1', method: 'cash', amount: money(15000) },
    )
    const { event } = completePayment(paid, {
      branchId: 'branch-riverside',
      actorId: 'cashier-1',
      completedAt: '2026-01-13T12:00:00.000Z',
      eventId: 'payment:payment-1:v1',
    })
    expect(
      parsePendingPaymentEvent(serializePendingPaymentEvent(event)),
    ).toEqual(event)
    expect(
      parsePendingPaymentEvent(
        JSON.stringify({ ...event, branchId: 'forged' }),
      ),
    ).toBeNull()
  })
})
