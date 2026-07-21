import {
  addMoney,
  money,
  multiplyMoney,
  type Currency,
  type Money,
} from './money.js'
import { calculateTax, type TaxRate } from './tax.js'

export type OrderLine = Readonly<{
  id: string
  unitPrice: Money
  quantity: number
  taxRate: TaxRate
}>

export type LineTotal = Readonly<{
  id: string
  quantity: number
  net: Money
  tax: Money
  gross: Money
}>

export type OrderTotal = Readonly<{
  lines: readonly LineTotal[]
  net: Money
  tax: Money
  gross: Money
}>

export function calculateOrderTotal(
  lines: readonly OrderLine[],
  currency: Currency = 'THB',
): OrderTotal {
  const zero = money(0, currency)

  const lineTotals = lines.map((line) => {
    if (!line.id.trim()) throw new TypeError('Order line requires an id')
    if (line.unitPrice.currency !== currency)
      throw new TypeError(`Expected ${currency} order line`)
    const breakdown = calculateTax(
      multiplyMoney(line.unitPrice, line.quantity),
      line.taxRate,
    )
    return { id: line.id, quantity: line.quantity, ...breakdown }
  })

  return lineTotals.reduce<OrderTotal>(
    (total, line) => ({
      lines: lineTotals,
      net: addMoney(total.net, line.net),
      tax: addMoney(total.tax, line.tax),
      gross: addMoney(total.gross, line.gross),
    }),
    { lines: lineTotals, net: zero, tax: zero, gross: zero },
  )
}
