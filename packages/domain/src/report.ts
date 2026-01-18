import type { Money } from './money.js'
import { validateReceipt, type Receipt } from './receipt.js'
import { validateRefund, type Refund } from './refund.js'

export type SalesReport = Readonly<{
  currency: Money['currency']
  from: string
  to: string
  orderCount: number
  grossMinor: number
  refundMinor: number
  netMinor: number
  averageOrderMinor: number
  tenders: Readonly<Record<'cash' | 'card' | 'qr', number>>
  products: readonly Readonly<{
    itemId: string
    name: string
    quantity: number
    grossMinor: number
  }>[]
}>
function checkedAdd(left: number, right: number, field: string) {
  const value = left + right
  if (!Number.isSafeInteger(value))
    throw new RangeError(`${field} exceeds safe integer range`)
  return value
}
function checkedMultiply(left: number, right: number, field: string) {
  const value = left * right
  if (!Number.isSafeInteger(value))
    throw new RangeError(`${field} exceeds safe integer range`)
  return value
}

export function buildSalesReport(
  receipts: readonly Receipt[],
  refunds: readonly Refund[],
  range: { from: string; to: string },
): SalesReport {
  const from = Date.parse(range.from)
  const to = Date.parse(range.to)
  if (Number.isNaN(from) || Number.isNaN(to) || from >= to)
    throw new TypeError('Report range is invalid')
  receipts.forEach(validateReceipt)
  refunds.forEach(validateRefund)
  const receiptById = new Map(receipts.map((receipt) => [receipt.id, receipt]))
  if (
    receiptById.size !== receipts.length ||
    new Set(refunds.map((refund) => refund.id)).size !== refunds.length
  )
    throw new TypeError('Report identities must be unique')
  const refundedByReceipt = new Map<string, number>()
  for (const refund of refunds) {
    const receipt = receiptById.get(refund.receiptId)
    if (
      !receipt ||
      receipt.order.id !== refund.orderId ||
      receipt.branchId !== refund.branchId
    )
      throw new TypeError('Report refund does not belong to a receipt')
    if (
      refund.amount.currency !== receipt.totals.gross.currency ||
      Date.parse(refund.createdAt) < Date.parse(receipt.issuedAt)
    )
      throw new TypeError('Report refund currency or chronology is invalid')
    const cumulative = checkedAdd(
      refundedByReceipt.get(receipt.id) ?? 0,
      refund.amount.minor,
      'Receipt refunds',
    )
    if (cumulative > receipt.totals.gross.minor)
      throw new TypeError('Report refunds exceed receipt total')
    refundedByReceipt.set(receipt.id, cumulative)
  }
  const selected = receipts.filter((receipt) => {
    const time = Date.parse(receipt.issuedAt)
    return time >= from && time < to
  })
  const selectedRefunds = refunds.filter((refund) => {
    const time = Date.parse(refund.createdAt)
    return time >= from && time < to
  })
  const currency =
    selected[0]?.totals.gross.currency ??
    selectedRefunds[0]?.amount.currency ??
    'THB'
  if (
    selected.some((receipt) => receipt.totals.gross.currency !== currency) ||
    selectedRefunds.some((refund) => refund.amount.currency !== currency)
  )
    throw new TypeError('Report currencies must match')
  const grossMinor = selected.reduce(
    (sum, receipt) =>
      checkedAdd(sum, receipt.totals.gross.minor, 'Report gross'),
    0,
  )
  const refundMinor = selectedRefunds.reduce(
    (sum, refund) => checkedAdd(sum, refund.amount.minor, 'Report refunds'),
    0,
  )
  const tenders = { cash: 0, card: 0, qr: 0 }
  const products = new Map<
    string,
    { itemId: string; name: string; quantity: number; grossMinor: number }
  >()
  for (const receipt of selected) {
    for (const tender of receipt.payment.session.tenders)
      tenders[tender.method] = checkedAdd(
        tenders[tender.method],
        tender.amount.minor,
        'Tender total',
      )
    tenders.cash = checkedAdd(
      tenders.cash,
      -receipt.payment.summary.change.minor,
      'Cash tender',
    )
    for (const line of receipt.order.lines) {
      const current = products.get(line.itemId) ?? {
        itemId: line.itemId,
        name: line.name,
        quantity: 0,
        grossMinor: 0,
      }
      current.quantity = checkedAdd(
        current.quantity,
        line.quantity,
        'Product quantity',
      )
      const unit = line.modifiers.reduce(
        (sum, option) =>
          checkedAdd(sum, option.priceDelta.minor, 'Product unit value'),
        line.unitPrice.minor,
      )
      current.grossMinor = checkedAdd(
        current.grossMinor,
        checkedMultiply(unit, line.quantity, 'Product value'),
        'Product value',
      )
      products.set(line.itemId, current)
    }
  }
  return {
    currency,
    from: range.from,
    to: range.to,
    orderCount: selected.length,
    grossMinor,
    refundMinor,
    netMinor: checkedAdd(grossMinor, -refundMinor, 'Report net'),
    averageOrderMinor: selected.length
      ? Math.round(grossMinor / selected.length)
      : 0,
    tenders,
    products: [...products.values()].sort(
      (a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name),
    ),
  }
}
