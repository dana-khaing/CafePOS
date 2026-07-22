import { type Receipt, validateReceipt } from '@cafepos/domain'

export const RECEIPT_STORAGE_KEY = 'cafepos.current-receipt.v1'

export function parseStoredReceipt(value: string | null): Receipt | null {
  if (!value) return null
  try {
    return validateReceipt(JSON.parse(value) as Receipt)
  } catch {
    return null
  }
}

export function serializeReceipt(receipt: Receipt) {
  return JSON.stringify(validateReceipt(receipt))
}
