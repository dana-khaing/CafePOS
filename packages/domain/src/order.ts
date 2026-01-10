import { addMoney, money, type Currency, type Money } from './money.js'
import { calculateTax, type TaxRate, validateTaxRate } from './tax.js'

export type OrderLineModifier = Readonly<{
  optionId: string
  name: string
  priceDelta: Money
}>

export type DraftOrderLine = Readonly<{
  id: string
  itemId: string
  name: string
  quantity: number
  unitPrice: Money
  modifiers: readonly OrderLineModifier[]
  taxRate: TaxRate
  note?: string
}>

export type DraftOrder = Readonly<{
  id: string
  currency: Currency
  diningMode: 'counter' | 'takeaway' | 'table'
  tableNumber?: string
  lines: readonly DraftOrderLine[]
}>

export function validateDraftOrder(order: DraftOrder): DraftOrder {
  if (!order.id.trim()) throw new TypeError('Order id is required')
  if (order.currency !== 'THB' && order.currency !== 'MMK')
    throw new TypeError('Order currency is unsupported')
  if (!['counter', 'takeaway', 'table'].includes(order.diningMode))
    throw new TypeError('Dining mode is unsupported')
  if (order.diningMode === 'table' && !order.tableNumber?.trim())
    throw new TypeError('Table orders require a table number')
  if (order.diningMode !== 'table' && order.tableNumber !== undefined)
    throw new TypeError('Only table orders may have a table number')
  const ids = new Set<string>()
  for (const line of order.lines) {
    if (!line.id.trim() || !line.itemId.trim() || !line.name.trim())
      throw new TypeError('Order line identity and name are required')
    if (ids.has(line.id)) throw new TypeError('Order line ids must be unique')
    ids.add(line.id)
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1)
      throw new RangeError('Order line quantity must be a positive integer')
    if (
      line.unitPrice.currency !== order.currency ||
      !Number.isSafeInteger(line.unitPrice.minor) ||
      line.unitPrice.minor < 0
    )
      throw new TypeError('Order line price is invalid')
    validateTaxRate(line.taxRate)
    for (const modifier of line.modifiers) {
      if (!modifier.optionId.trim() || !modifier.name.trim())
        throw new TypeError('Order modifier identity and name are required')
      if (
        modifier.priceDelta.currency !== order.currency ||
        !Number.isSafeInteger(modifier.priceDelta.minor) ||
        modifier.priceDelta.minor < 0
      )
        throw new TypeError('Order modifier price is invalid')
    }
  }
  return order
}

export function setDraftOrderDiningMode(
  order: DraftOrder,
  diningMode: DraftOrder['diningMode'],
  tableNumber?: string,
): DraftOrder {
  return validateDraftOrder({
    ...order,
    diningMode,
    tableNumber: diningMode === 'table' ? tableNumber : undefined,
  })
}

export function addDraftOrderLine(
  order: DraftOrder,
  line: DraftOrderLine,
): DraftOrder {
  return validateDraftOrder({ ...order, lines: [...order.lines, line] })
}

export function setDraftOrderLineQuantity(
  order: DraftOrder,
  lineId: string,
  quantity: number,
): DraftOrder {
  if (quantity === 0)
    return { ...order, lines: order.lines.filter((line) => line.id !== lineId) }
  if (!order.lines.some((line) => line.id === lineId))
    throw new Error(`Order line not found: ${lineId}`)
  return validateDraftOrder({
    ...order,
    lines: order.lines.map((line) =>
      line.id === lineId ? { ...line, quantity } : line,
    ),
  })
}

export function calculateDraftOrderTotal(order: DraftOrder) {
  validateDraftOrder(order)
  const zero = money(0, order.currency)
  return order.lines.reduce(
    (total, line) => {
      const modifiers = line.modifiers.reduce(
        (sum, modifier) => addMoney(sum, modifier.priceDelta),
        zero,
      )
      const unit = addMoney(line.unitPrice, modifiers)
      const amount = money(unit.minor * line.quantity, order.currency)
      const breakdown = calculateTax(amount, line.taxRate)
      return {
        net: addMoney(total.net, breakdown.net),
        tax: addMoney(total.tax, breakdown.tax),
        gross: addMoney(total.gross, breakdown.gross),
      }
    },
    { net: zero, tax: zero, gross: zero },
  )
}
