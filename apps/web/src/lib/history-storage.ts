import {
  refundedTotal,
  type Receipt,
  type Refund,
  type SyncEvent,
  validateReceipt,
  validateRefund,
  validateRefundEvent,
} from '@cafepos/domain'

export const HISTORY_STORAGE_KEY = 'cafepos.sale-history.v1'
export type SaleHistory = Readonly<{
  receipts: readonly Receipt[]
  refunds: readonly Refund[]
  pendingRefunds: readonly SyncEvent[]
}>
export const emptyHistory = (): SaleHistory => ({
  receipts: [],
  refunds: [],
  pendingRefunds: [],
})

export function validateSaleHistory(history: SaleHistory): SaleHistory {
  if (
    !Array.isArray(history.receipts) ||
    !Array.isArray(history.refunds) ||
    !Array.isArray(history.pendingRefunds)
  )
    throw new TypeError('Sale history is invalid')
  const receipts = new Map(
    history.receipts.map((receipt) => {
      validateReceipt(receipt)
      return [receipt.id, receipt]
    }),
  )
  if (
    receipts.size !== history.receipts.length ||
    new Set(history.refunds.map((entry) => entry.id)).size !==
      history.refunds.length
  )
    throw new TypeError('Sale history identities must be unique')
  history.refunds.forEach((refund) => {
    validateRefund(refund)
    const receipt = receipts.get(refund.receiptId)
    if (
      !receipt ||
      refund.orderId !== receipt.order.id ||
      refund.branchId !== receipt.branchId
    )
      throw new TypeError('Refund does not belong to a stored receipt')
  })
  for (const receipt of history.receipts) {
    const total = refundedTotal(
      history.refunds.filter((entry) => entry.receiptId === receipt.id),
      receipt.totals.gross.currency,
    )
    if (total.minor > receipt.totals.gross.minor)
      throw new TypeError('Stored refunds exceed receipt total')
  }
  history.pendingRefunds.forEach(validateRefundEvent)
  return history
}
export function parseSaleHistory(value: string | null): SaleHistory {
  if (!value) return emptyHistory()
  try {
    return validateSaleHistory(JSON.parse(value) as SaleHistory)
  } catch {
    return emptyHistory()
  }
}
export function serializeSaleHistory(history: SaleHistory) {
  return JSON.stringify(validateSaleHistory(history))
}
export function appendReceipt(
  history: SaleHistory,
  receipt: Receipt,
): SaleHistory {
  validateReceipt(receipt)
  if (history.receipts.some((entry) => entry.id === receipt.id)) return history
  return validateSaleHistory({
    ...history,
    receipts: [receipt, ...history.receipts],
  })
}
export function stageRefund(
  history: SaleHistory,
  event: SyncEvent,
): SaleHistory {
  validateRefundEvent(event)
  if (history.pendingRefunds.some((entry) => entry.id === event.id))
    return history
  return validateSaleHistory({
    ...history,
    pendingRefunds: [...history.pendingRefunds, event],
  })
}
export function settleRefund(
  history: SaleHistory,
  eventId: string,
): SaleHistory {
  const event = history.pendingRefunds.find((entry) => entry.id === eventId)
  if (!event) throw new TypeError('Pending refund was not found')
  const refund = validateRefundEvent(event)
  return validateSaleHistory({
    ...history,
    refunds: [...history.refunds, refund],
    pendingRefunds: history.pendingRefunds.filter(
      (entry) => entry.id !== eventId,
    ),
  })
}
