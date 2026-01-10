import { describe, expect, it } from 'vitest'

import { money } from './money'
import {
  addDraftOrderLine,
  calculateDraftOrderTotal,
  setDraftOrderLineQuantity,
  type DraftOrder,
  type DraftOrderLine,
  validateDraftOrder,
} from './order'

const vat = {
  id: 'vat7',
  name: 'VAT',
  basisPoints: 700,
  mode: 'inclusive' as const,
}
const line: DraftOrderLine = {
  id: 'line-1',
  itemId: 'latte',
  name: 'Latte',
  quantity: 1,
  unitPrice: money(12000),
  modifiers: [{ optionId: 'oat', name: 'Oat milk', priceDelta: money(2000) }],
  taxRate: vat,
}
const order: DraftOrder = {
  id: 'order-1',
  currency: 'THB',
  diningMode: 'counter',
  lines: [],
}

describe('draft order', () => {
  it('adds snapshots and calculates modifier-aware inclusive totals', () => {
    const updated = addDraftOrderLine(order, line)
    expect(calculateDraftOrderTotal(updated)).toEqual({
      net: money(13084),
      tax: money(916),
      gross: money(14000),
    })
  })

  it('changes quantity and removes a line at zero', () => {
    const added = addDraftOrderLine(order, line)
    expect(
      setDraftOrderLineQuantity(added, 'line-1', 2).lines[0].quantity,
    ).toBe(2)
    expect(setDraftOrderLineQuantity(added, 'line-1', 0).lines).toEqual([])
  })

  it('rejects forged quantities, prices, currencies, and duplicate ids', () => {
    expect(() =>
      validateDraftOrder({ ...order, lines: [{ ...line, quantity: 1.5 }] }),
    ).toThrow('quantity')
    expect(() =>
      validateDraftOrder({
        ...order,
        lines: [{ ...line, unitPrice: { currency: 'THB', minor: 1.5 } }],
      }),
    ).toThrow('price')
    expect(() =>
      validateDraftOrder({
        ...order,
        lines: [
          {
            ...line,
            modifiers: [{ ...line.modifiers[0], priceDelta: money(1, 'MMK') }],
          },
        ],
      }),
    ).toThrow('modifier')
    expect(() => validateDraftOrder({ ...order, lines: [line, line] })).toThrow(
      'unique',
    )
    expect(() =>
      validateDraftOrder({ ...order, currency: 'USD' as never }),
    ).toThrow('currency')
    expect(() =>
      validateDraftOrder({
        ...order,
        lines: [
          {
            ...line,
            taxRate: { ...vat, basisPoints: 1.5, mode: 'bogus' as never },
          },
        ],
      }),
    ).toThrow()
  })

  it('requires a table number only for table service', () => {
    expect(() => validateDraftOrder({ ...order, diningMode: 'table' })).toThrow(
      'table number',
    )
    expect(
      validateDraftOrder({
        ...order,
        diningMode: 'table',
        tableNumber: 'A12',
      }).tableNumber,
    ).toBe('A12')
    expect(() => validateDraftOrder({ ...order, tableNumber: 'A12' })).toThrow(
      'Only table',
    )
  })
})
