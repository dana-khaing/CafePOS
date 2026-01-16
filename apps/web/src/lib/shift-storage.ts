import {
  addCashMovement,
  money,
  type CashShift,
  type Receipt,
  type Refund,
  validateCashShift,
} from '@cafepos/domain'
export const SHIFT_STORAGE_KEY = 'cafepos.cash-shifts.v1'
export type ShiftLedger = Readonly<{
  current: CashShift | null
  archive: readonly CashShift[]
}>
export const emptyShiftLedger = (): ShiftLedger => ({
  current: null,
  archive: [],
})
export function validateShiftLedger(value: ShiftLedger) {
  if (!Array.isArray(value.archive))
    throw new TypeError('Shift ledger is invalid')
  if (value.current) {
    validateCashShift(value.current)
    if (value.current.status !== 'open')
      throw new TypeError('Current shift must be open')
  }
  value.archive.forEach((entry) => {
    validateCashShift(entry)
    if (entry.status !== 'closed')
      throw new TypeError('Archived shift must be closed')
  })
  const ids = [
    value.current?.id,
    ...value.archive.map((entry) => entry.id),
  ].filter(Boolean)
  if (new Set(ids).size !== ids.length)
    throw new TypeError('Shift ids must be unique')
  return value
}
export function parseShiftLedger(raw: string | null): ShiftLedger {
  if (!raw) return emptyShiftLedger()
  try {
    return validateShiftLedger(JSON.parse(raw) as ShiftLedger)
  } catch {
    return emptyShiftLedger()
  }
}
export function serializeShiftLedger(value: ShiftLedger) {
  return JSON.stringify(validateShiftLedger(value))
}
export function recordCashSale(
  ledger: ShiftLedger,
  receipt: Receipt,
): ShiftLedger {
  if (!ledger.current) return ledger
  const id = `sale:${receipt.id}`
  if (ledger.current.movements.some((entry) => entry.id === id)) return ledger
  const cash =
    receipt.payment.session.tenders
      .filter((entry) => entry.method === 'cash')
      .reduce((sum, entry) => sum + entry.amount.minor, 0) -
    receipt.payment.summary.change.minor
  if (cash < 1) return ledger
  return {
    ...ledger,
    current: addCashMovement(ledger.current, {
      id,
      type: 'sale',
      amount: money(cash, receipt.totals.gross.currency),
      reason: receipt.number,
      occurredAt: receipt.issuedAt,
    }),
  }
}
export function recordCashRefund(
  ledger: ShiftLedger,
  refund: Refund,
): ShiftLedger {
  if (!ledger.current) return ledger
  const id = `refund:${refund.id}`
  if (ledger.current.movements.some((entry) => entry.id === id)) return ledger
  return {
    ...ledger,
    current: addCashMovement(ledger.current, {
      id,
      type: 'refund',
      amount: refund.amount,
      reason: refund.reason,
      occurredAt: refund.createdAt,
    }),
  }
}
