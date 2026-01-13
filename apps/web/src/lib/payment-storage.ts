import {
  type PaymentSession,
  type SyncEvent,
  validateCompletedPaymentEvent,
  validatePaymentSession,
} from '@cafepos/domain'

export const PAYMENT_STORAGE_KEY = 'cafepos.pending-payment.v1'
export const PENDING_PAYMENT_EVENT_KEY = 'cafepos.pending-payment-event.v1'
export function parseStoredPayment(
  value: string | null,
): PaymentSession | null {
  if (!value) return null
  try {
    return validatePaymentSession(JSON.parse(value) as PaymentSession)
  } catch {
    return null
  }
}
export function serializePayment(session: PaymentSession) {
  return JSON.stringify(validatePaymentSession(session))
}

export function parsePendingPaymentEvent(
  value: string | null,
): SyncEvent | null {
  if (!value) return null
  try {
    const event = JSON.parse(value) as SyncEvent
    validateCompletedPaymentEvent(event)
    return event
  } catch {
    return null
  }
}

export function serializePendingPaymentEvent(event: SyncEvent) {
  validateCompletedPaymentEvent(event)
  return JSON.stringify(event)
}
