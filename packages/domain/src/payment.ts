import { addMoney, money, type Money } from './money.js'

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

export function createPaymentSession(
  id: string,
  orderId: string,
  due: Money,
): PaymentSession {
  if (!id.trim() || !orderId.trim())
    throw new TypeError('Payment and order ids are required')
  if (!Number.isSafeInteger(due.minor) || due.minor < 1)
    throw new TypeError('Payment due must be positive')
  return { id, orderId, due, tenders: [], status: 'open' }
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

export function addPaymentTender(
  session: PaymentSession,
  tender: PaymentTender,
): PaymentSession {
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
  const tenders = session.tenders.filter((tender) => tender.id !== tenderId)
  if (tenders.length === session.tenders.length)
    throw new Error(`Tender not found: ${tenderId}`)
  return { ...session, tenders, status: 'open' }
}
