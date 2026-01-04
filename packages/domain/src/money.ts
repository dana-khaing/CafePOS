export type Currency = 'THB' | 'MMK'

export type Money = Readonly<{
  currency: Currency
  minor: number
}>

function assertMinorUnits(value: number) {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('Money minor units must be a safe integer')
  }
}

export function money(minor: number, currency: Currency = 'THB'): Money {
  assertMinorUnits(minor)
  return Object.freeze({ minor, currency })
}

function assertSameCurrency(left: Money, right: Money) {
  if (left.currency !== right.currency) {
    throw new TypeError(
      `Currency mismatch: ${left.currency} and ${right.currency}`,
    )
  }
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right)
  return money(left.minor + right.minor, left.currency)
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right)
  return money(left.minor - right.minor, left.currency)
}

export function multiplyMoney(value: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError('Quantity must be a non-negative safe integer')
  }
  return money(value.minor * quantity, value.currency)
}

export function sumMoney(
  values: readonly Money[],
  currency: Currency = 'THB',
): Money {
  return values.reduce(
    (total, value) => addMoney(total, value),
    money(0, currency),
  )
}
