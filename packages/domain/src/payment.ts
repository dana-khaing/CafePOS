import { addMoney, money, type Money } from './money.js'
import {
  type JsonValue,
  type SyncEvent,
  validateSyncEvent,
} from './sync-event.js'

export type PaymentMethod = 'cash' | 'card' | 'qr'
export type PaymentTender = Readonly<{
  id: string
  method: PaymentMethod
  amount: Money
  reference?: string
}>
export type PaymentSession = Readonly<{
  id: string
  orderId: string
  due: Money
  tenders: readonly PaymentTender[]
  status: 'open' | 'paid'
}>
export type CompletedPayment = Readonly<{
  id: string
  orderId: string
  branchId: string
  actorId: string
  completedAt: string
  version: 1
  session: PaymentSession
  summary: ReturnType<typeof paymentSummary>
}>

export function createPaymentSession(
  id: string,
  orderId: string,
  due: Money,
): PaymentSession {
  if (!id.trim() || !orderId.trim())
    throw new TypeError('Payment and order ids are required')
  if (!Number.isSafeInteger(due.minor) || due.minor < 1)
    throw new TypeError('Payment due must be positive')
  return validatePaymentSession({
    id,
    orderId,
    due,
    tenders: [],
    status: 'open',
  })
}

export function paymentSummary(session: PaymentSession) {
  const paid = session.tenders.reduce(
    (total, tender) => addMoney(total, tender.amount),
    money(0, session.due.currency),
  )
  const overpayment = Math.max(0, paid.minor - session.due.minor)
  return {
    paid,
    remaining: money(
      Math.max(0, session.due.minor - paid.minor),
      session.due.currency,
    ),
    change: money(overpayment, session.due.currency),
  }
}

export function validatePaymentSession(
  session: PaymentSession,
): PaymentSession {
  if (!session.id?.trim() || !session.orderId?.trim())
    throw new TypeError('Payment and order ids are required')
  if (
    !['THB', 'MMK'].includes(session.due.currency) ||
    !Number.isSafeInteger(session.due.minor) ||
    session.due.minor < 1
  )
    throw new TypeError('Payment due is invalid')
  if (!Array.isArray(session.tenders))
    throw new TypeError('Payment tenders are invalid')
  const ids = new Set<string>()
  let nonCashMinor = 0
  for (const tender of session.tenders) {
    if (!tender.id?.trim() || ids.has(tender.id))
      throw new TypeError('Tender ids must be nonempty and unique')
    ids.add(tender.id)
    if (!['cash', 'card', 'qr'].includes(tender.method))
      throw new TypeError('Payment method is invalid')
    if (
      tender.amount.currency !== session.due.currency ||
      !Number.isSafeInteger(tender.amount.minor) ||
      tender.amount.minor < 1
    )
      throw new TypeError('Tender amount is invalid')
    if (tender.method !== 'cash') nonCashMinor += tender.amount.minor
    if (
      tender.reference !== undefined &&
      (typeof tender.reference !== 'string' || !tender.reference.trim())
    )
      throw new TypeError('Payment reference cannot be empty')
  }
  if (nonCashMinor > session.due.minor)
    throw new TypeError('Non-cash tenders exceed payment due')
  const expected =
    paymentSummary(session).remaining.minor === 0 ? 'paid' : 'open'
  if (session.status !== expected)
    throw new TypeError('Payment status does not match tenders')
  return session
}

export function addPaymentTender(
  session: PaymentSession,
  tender: PaymentTender,
): PaymentSession {
  validatePaymentSession(session)
  if (session.status === 'paid') throw new Error('Paid sessions cannot change')
  if (!tender.id.trim()) throw new TypeError('Tender id is required')
  if (session.tenders.some((entry) => entry.id === tender.id))
    throw new TypeError('Tender ids must be unique')
  if (!['cash', 'card', 'qr'].includes(tender.method))
    throw new TypeError('Payment method is invalid')
  if (
    tender.amount.currency !== session.due.currency ||
    !Number.isSafeInteger(tender.amount.minor) ||
    tender.amount.minor < 1
  )
    throw new TypeError('Tender amount is invalid')
  if (
    tender.method !== 'cash' &&
    tender.reference !== undefined &&
    !tender.reference.trim()
  )
    throw new TypeError('Payment reference cannot be empty')
  const before = paymentSummary(session)
  if (tender.method !== 'cash' && tender.amount.minor > before.remaining.minor)
    throw new RangeError('Non-cash tender cannot exceed remaining balance')
  const updated: PaymentSession = {
    ...session,
    tenders: [...session.tenders, tender],
  }
  return {
    ...updated,
    status: paymentSummary(updated).remaining.minor === 0 ? 'paid' : 'open',
  }
}

export function removePaymentTender(
  session: PaymentSession,
  tenderId: string,
): PaymentSession {
  validatePaymentSession(session)
  const tenders = session.tenders.filter((tender) => tender.id !== tenderId)
  if (tenders.length === session.tenders.length)
    throw new Error(`Tender not found: ${tenderId}`)
  return { ...session, tenders, status: 'open' }
}

export function completePayment(
  session: PaymentSession,
  context: {
    branchId: string
    actorId: string
    completedAt: string
    eventId: string
  },
): { payment: CompletedPayment; event: SyncEvent } {
  validatePaymentSession(session)
  if (session.status !== 'paid')
    throw new TypeError('Payment must be fully paid')
  for (const [value, field] of [
    [context.branchId, 'Branch id'],
    [context.actorId, 'Actor id'],
    [context.eventId, 'Event id'],
  ] as const)
    if (!value.trim()) throw new TypeError(`${field} is required`)
  if (Number.isNaN(Date.parse(context.completedAt)))
    throw new TypeError('Payment completion time is invalid')
  const payment: CompletedPayment = {
    id: session.id,
    orderId: session.orderId,
    branchId: context.branchId,
    actorId: context.actorId,
    completedAt: context.completedAt,
    version: 1,
    session,
    summary: paymentSummary(session),
  }
  const payload = JSON.parse(JSON.stringify(payment)) as Record<
    string,
    JsonValue
  >
  return {
    payment,
    event: {
      id: context.eventId,
      schemaVersion: 1,
      branchId: context.branchId,
      actorId: context.actorId,
      entityType: 'payment',
      entityId: payment.id,
      aggregateVersion: 1,
      operation: 'upsert',
      occurredAt: context.completedAt,
      payload,
    },
  }
}

export function validateCompletedPaymentEvent(
  event: SyncEvent,
): CompletedPayment {
  validateSyncEvent(event)
  if (
    event.entityType !== 'payment' ||
    event.operation !== 'upsert' ||
    !event.payload
  )
    throw new TypeError('Event is not a payment upsert')
  const payment = event.payload as unknown as CompletedPayment
  if (
    !payment.id?.trim() ||
    !payment.orderId?.trim() ||
    !payment.branchId?.trim() ||
    !payment.actorId?.trim() ||
    payment.version !== 1 ||
    Number.isNaN(Date.parse(payment.completedAt))
  )
    throw new TypeError('Completed payment identity is invalid')
  validatePaymentSession(payment.session)
  if (
    payment.session.status !== 'paid' ||
    payment.session.id !== payment.id ||
    payment.session.orderId !== payment.orderId
  )
    throw new TypeError('Completed payment session is inconsistent')
  const summary = paymentSummary(payment.session)
  if (JSON.stringify(summary) !== JSON.stringify(payment.summary))
    throw new TypeError('Completed payment summary is invalid')
  if (
    event.entityId !== payment.id ||
    event.branchId !== payment.branchId ||
    event.actorId !== payment.actorId ||
    event.occurredAt !== payment.completedAt
  )
    throw new TypeError('Payment event envelope does not match payload')
  return payment
}
