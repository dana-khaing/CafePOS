import { describe, expect, it } from 'vitest'

import { money } from './money'
import { calculateTax } from './tax'

describe('tax calculation', () => {
  it('adds exclusive tax using half-up rounding', () => {
    expect(
      calculateTax(money(10_005), {
        id: 'vat7',
        name: 'VAT 7%',
        basisPoints: 700,
        mode: 'exclusive',
      }),
    ).toEqual({
      net: money(10_005),
      tax: money(700),
      gross: money(10_705),
    })
  })

  it('extracts inclusive tax while preserving the charged total', () => {
    expect(
      calculateTax(money(10_700), {
        id: 'vat7',
        name: 'VAT 7%',
        basisPoints: 700,
        mode: 'inclusive',
      }),
    ).toEqual({
      net: money(10_000),
      tax: money(700),
      gross: money(10_700),
    })
  })

  it('rounds inclusive tax half-up at an exact tie', () => {
    expect(
      calculateTax(money(1), {
        id: 'full',
        name: '100%',
        basisPoints: 10_000,
        mode: 'inclusive',
      }),
    ).toEqual({ net: money(0), tax: money(1), gross: money(1) })
  })

  it('uses exact integer intermediates near the safe-integer boundary', () => {
    const gross = money(Number.MAX_SAFE_INTEGER)
    const result = calculateTax(gross, {
      id: 'tiny',
      name: '0.07%',
      basisPoints: 7,
      mode: 'inclusive',
    })

    expect(result.net).toEqual(money(9_000_898_625_702_999))
    expect(result.tax.minor + result.net.minor).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('rejects invalid rates and negative taxable amounts', () => {
    expect(() =>
      calculateTax(money(100), {
        id: 'bad',
        name: 'Bad',
        basisPoints: 10_001,
        mode: 'exclusive',
      }),
    ).toThrow(RangeError)
    expect(() =>
      calculateTax(money(-1), {
        id: 'vat',
        name: 'VAT',
        basisPoints: 700,
        mode: 'exclusive',
      }),
    ).toThrow(RangeError)
    expect(() =>
      calculateTax(money(100), {
        id: 'vat',
        name: 'VAT',
        basisPoints: 700,
        mode: 'other' as 'inclusive',
      }),
    ).toThrow(TypeError)
    expect(() =>
      calculateTax(money(Number.MAX_SAFE_INTEGER), {
        id: 'vat',
        name: 'VAT',
        basisPoints: 700,
        mode: 'exclusive',
      }),
    ).toThrow(RangeError)
  })
})
