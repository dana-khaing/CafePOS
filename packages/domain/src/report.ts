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
  const selected = receipts.filter((receipt) => {
    const time = Date.parse(receipt.issuedAt)
    return time >= from && time < to
  })
  const currency =
    selected[0]?.totals.gross.currency ??
    receipts[0]?.totals.gross.currency ??
    'THB'
  if (
    selected.some((receipt) => receipt.totals.gross.currency !== currency) ||
    refunds.some((refund) => refund.amount.currency !== currency)
  )
    throw new TypeError('Report currencies must match')
  const grossMinor = selected.reduce(
    (sum, receipt) => sum + receipt.totals.gross.minor,
    0,
  )
  const selectedRefunds = refunds.filter((refund) => {
    const time = Date.parse(refund.createdAt)
    return time >= from && time < to
  })
  const refundMinor = selectedRefunds.reduce(
    (sum, refund) => sum + refund.amount.minor,
    0,
  )
  const tenders = { cash: 0, card: 0, qr: 0 }
  const products = new Map<
    string,
    { itemId: string; name: string; quantity: number; grossMinor: number }
  >()
  for (const receipt of selected) {
    for (const tender of receipt.payment.session.tenders)
      tenders[tender.method] += tender.amount.minor
    tenders.cash -= receipt.payment.summary.change.minor
    for (const line of receipt.order.lines) {
      const current = products.get(line.itemId) ?? {
        itemId: line.itemId,
        name: line.name,
        quantity: 0,
        grossMinor: 0,
      }
      current.quantity += line.quantity
      current.grossMinor +=
        (line.unitPrice.minor +
          line.modifiers.reduce(
            (sum, option) => sum + option.priceDelta.minor,
            0,
          )) *
        line.quantity
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
    netMinor: grossMinor - refundMinor,
    averageOrderMinor: selected.length
      ? Math.round(grossMinor / selected.length)
      : 0,
    tenders,
    products: [...products.values()].sort(
      (a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name),
    ),
  }
}
