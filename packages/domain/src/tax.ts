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

export function validateTaxRate(rate: TaxRate): TaxRate {
  if (!rate.id.trim() || !rate.name.trim())
    throw new TypeError('Tax rate requires an id and name')
  if (rate.mode !== 'exclusive' && rate.mode !== 'inclusive')
    throw new TypeError(`Unsupported tax mode: ${String(rate.mode)}`)
  if (
    !Number.isSafeInteger(rate.basisPoints) ||
    rate.basisPoints < 0 ||
    rate.basisPoints > 10_000
  ) {
    throw new RangeError('Tax basis points must be an integer from 0 to 10000')
  }
  return rate
}

function roundHalfUp(numerator: bigint, denominator: bigint) {
  const rounded = (numerator * 2n + denominator) / (denominator * 2n)
  const value = Number(rounded)
  if (!Number.isSafeInteger(value))
    throw new RangeError('Tax result exceeds safe integer range')
  return value
}

export function calculateTax(amount: Money, rate: TaxRate): TaxBreakdown {
  validateTaxRate(rate)
  if (amount.minor < 0)
    throw new RangeError('Taxable amount cannot be negative')

  if (rate.mode === 'exclusive') {
    const taxMinor = roundHalfUp(
      BigInt(amount.minor) * BigInt(rate.basisPoints),
      10_000n,
    )
    return {
      net: amount,
      tax: money(taxMinor, amount.currency),
      gross: money(amount.minor + taxMinor, amount.currency),
    }
  }

  const taxMinor = roundHalfUp(
    BigInt(amount.minor) * BigInt(rate.basisPoints),
    BigInt(10_000 + rate.basisPoints),
  )
  return {
    net: money(amount.minor - taxMinor, amount.currency),
    tax: money(taxMinor, amount.currency),
    gross: amount,
  }
}
