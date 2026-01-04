import { describe, expect, it } from 'vitest'

import { money } from './money'
import { calculateOrderTotal } from './totals'

const vat7Exclusive = {
  id: 'vat7-ex',
  name: 'VAT 7%',
  basisPoints: 700,
  mode: 'exclusive',
} as const
const vat7Inclusive = {
  id: 'vat7-in',
  name: 'VAT 7%',
  basisPoints: 700,
  mode: 'inclusive',
} as const

describe('order totals', () => {
  it('totals mixed tax modes deterministically per line', () => {
    const result = calculateOrderTotal([
      {
        id: 'coffee',
        unitPrice: money(10_000),
        quantity: 2,
        taxRate: vat7Exclusive,
      },
      {
        id: 'cake',
        unitPrice: money(5_350),
        quantity: 2,
        taxRate: vat7Inclusive,
      },
    ])

    expect(result.net).toEqual(money(30_000))
    expect(result.tax).toEqual(money(2_100))
    expect(result.gross).toEqual(money(32_100))
    expect(result.lines).toHaveLength(2)
  })

  it('returns zero totals for an empty order', () => {
    expect(calculateOrderTotal([])).toEqual({
      lines: [],
      net: money(0),
      tax: money(0),
      gross: money(0),
    })
  })

  it('rejects lines in a different currency', () => {
    expect(() =>
      calculateOrderTotal([
        {
          id: 'coffee',
          unitPrice: money(100, 'MMK'),
          quantity: 1,
          taxRate: vat7Exclusive,
        },
      ]),
    ).toThrow(TypeError)
  })
})
