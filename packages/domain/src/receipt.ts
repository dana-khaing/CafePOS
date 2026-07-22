import {
  calculateDraftOrderTotal,
  type DraftOrder,
  validateDraftOrder,
} from './order.js'
import { type CompletedPayment, validateCompletedPayment } from './payment.js'

export type Receipt = Readonly<{
  id: string
  number: string
  branchId: string
  actorId: string
  issuedAt: string
  order: DraftOrder
  totals: ReturnType<typeof calculateDraftOrderTotal>
  payment: CompletedPayment
  version: 1
}>

function sameMoney(
  left: { currency: string; minor: number },
  right: { currency: string; minor: number },
) {
  return left.currency === right.currency && left.minor === right.minor
}

function canonicalIdentity(payment: CompletedPayment, orderId: string) {
  const date = payment.completedAt.slice(0, 10).replaceAll('-', '')
  return {
    id: `receipt:${payment.id}`,
    number: `R-${date}-${orderId.slice(-8).toUpperCase()}`,
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

export function validateReceipt(receipt: Receipt): Receipt {
  if (
    !receipt.id?.trim() ||
    !receipt.number?.trim() ||
    !receipt.branchId?.trim() ||
    !receipt.actorId?.trim()
  )
    throw new TypeError('Receipt identity is invalid')
  if (receipt.version !== 1 || Number.isNaN(Date.parse(receipt.issuedAt)))
    throw new TypeError('Receipt version or issue time is invalid')
  validateDraftOrder(receipt.order)
  validateCompletedPayment(receipt.payment)
  if (
    receipt.payment.session.status !== 'paid' ||
    receipt.payment.orderId !== receipt.order.id ||
    receipt.payment.branchId !== receipt.branchId ||
    receipt.payment.actorId !== receipt.actorId ||
    receipt.payment.completedAt !== receipt.issuedAt
  )
    throw new TypeError('Receipt payment does not match order or issuer')
  const canonical = canonicalIdentity(receipt.payment, receipt.order.id)
  if (receipt.id !== canonical.id || receipt.number !== canonical.number)
    throw new TypeError('Receipt identity is not canonical')
  const totals = calculateDraftOrderTotal(receipt.order)
  if (
    !sameMoney(receipt.totals.net, totals.net) ||
    !sameMoney(receipt.totals.tax, totals.tax) ||
    !sameMoney(receipt.totals.gross, totals.gross) ||
    !sameMoney(receipt.payment.session.due, totals.gross)
  )
    throw new TypeError('Receipt totals do not match order and payment')
  return receipt
}

export function createReceipt(
  order: DraftOrder,
  payment: CompletedPayment,
): Receipt {
  validateDraftOrder(order)
  validateCompletedPayment(payment)
  const identity = canonicalIdentity(payment, order.id)
  const snapshot = JSON.parse(
    JSON.stringify({
      ...identity,
      branchId: payment.branchId,
      actorId: payment.actorId,
      issuedAt: payment.completedAt,
      order,
      totals: calculateDraftOrderTotal(order),
      payment,
      version: 1,
    }),
  ) as Receipt
  return deepFreeze(validateReceipt(snapshot))
}
