import { money, type Money } from './money.js'

export type TaxMode = 'exclusive' | 'inclusive'

export type TaxRate = Readonly<{
  id: string
  name: string
  basisPoints: number
  mode: TaxMode
}>

export type TaxBreakdown = Readonly<{
  net: Money
  tax: Money
  gross: Money
}>

function validateRate(rate: TaxRate) {
  if (!rate.id.trim() || !rate.name.trim())
    throw new TypeError('Tax rate requires an id and name')
  if (
    !Number.isSafeInteger(rate.basisPoints) ||
    rate.basisPoints < 0 ||
    rate.basisPoints > 10_000
  ) {
    throw new RangeError('Tax basis points must be an integer from 0 to 10000')
  }
}

function roundHalfUp(numerator: number, denominator: number) {
  return Math.floor((numerator + denominator / 2) / denominator)
}

export function calculateTax(amount: Money, rate: TaxRate): TaxBreakdown {
  validateRate(rate)
  if (amount.minor < 0)
    throw new RangeError('Taxable amount cannot be negative')

  if (rate.mode === 'exclusive') {
    const taxMinor = roundHalfUp(amount.minor * rate.basisPoints, 10_000)
    return {
      net: amount,
      tax: money(taxMinor, amount.currency),
      gross: money(amount.minor + taxMinor, amount.currency),
    }
  }

  const netMinor = roundHalfUp(amount.minor * 10_000, 10_000 + rate.basisPoints)
  return {
    net: money(netMinor, amount.currency),
    tax: money(amount.minor - netMinor, amount.currency),
    gross: amount,
  }
}
