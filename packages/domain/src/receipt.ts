import {
  calculateDraftOrderTotal,
  type DraftOrder,
  validateDraftOrder,
} from './order.js'
import { type CompletedPayment, validatePaymentSession } from './payment.js'

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
  validatePaymentSession(receipt.payment.session)
  if (
    receipt.payment.session.status !== 'paid' ||
    receipt.payment.orderId !== receipt.order.id ||
    receipt.payment.branchId !== receipt.branchId ||
    receipt.payment.actorId !== receipt.actorId ||
    receipt.payment.completedAt !== receipt.issuedAt
  )
    throw new TypeError('Receipt payment does not match order or issuer')
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
  const snapshot = JSON.parse(
    JSON.stringify(validateDraftOrder(order)),
  ) as DraftOrder
  const date = payment.completedAt.slice(0, 10).replaceAll('-', '')
  return validateReceipt({
    id: `receipt:${payment.id}`,
    number: `R-${date}-${order.id.slice(-8).toUpperCase()}`,
    branchId: payment.branchId,
    actorId: payment.actorId,
    issuedAt: payment.completedAt,
    order: snapshot,
    totals: calculateDraftOrderTotal(snapshot),
    payment,
    version: 1,
  })
}
