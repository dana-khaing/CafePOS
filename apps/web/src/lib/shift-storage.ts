import { type CashShift, validateCashShift } from '@cafepos/domain'
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
