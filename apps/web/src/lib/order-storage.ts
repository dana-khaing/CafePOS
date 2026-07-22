import { type DraftOrder, validateDraftOrder } from '@cafepos/domain'

export const ORDER_STORAGE_KEY = 'cafepos.draft-order.v1'

export function parseStoredOrder(
  serialized: string | null,
  fallback: DraftOrder,
): DraftOrder {
  if (!serialized) return fallback
  try {
    return validateDraftOrder(JSON.parse(serialized) as DraftOrder)
  } catch {
    return fallback
  }
}

export function serializeOrder(order: DraftOrder): string {
  return JSON.stringify(validateDraftOrder(order))
}
