import { describe, expect, it } from 'vitest'

import {
  addMoney,
  money,
  multiplyMoney,
  subtractMoney,
  sumMoney,
} from './money'

describe('money', () => {
  it('calculates with integer minor units', () => {
    expect(addMoney(money(1250), money(275))).toEqual(money(1525))
    expect(subtractMoney(money(1250), money(275))).toEqual(money(975))
    expect(multiplyMoney(money(1250), 3)).toEqual(money(3750))
    expect(sumMoney([money(100), money(250), money(50)])).toEqual(money(400))
  })

  it('rejects fractional units, invalid quantities, and mixed currencies', () => {
    expect(() => money(10.5)).toThrow(RangeError)
    expect(() => multiplyMoney(money(100), -1)).toThrow(RangeError)
    expect(() => addMoney(money(100, 'THB'), money(100, 'MMK'))).toThrow(
      TypeError,
    )
  })
})
