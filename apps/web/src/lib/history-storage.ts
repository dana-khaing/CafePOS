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
  const pendingRefunds = history.pendingRefunds.map(validateRefundEvent)
  const allRefunds = [...history.refunds, ...pendingRefunds]
  if (
    receipts.size !== history.receipts.length ||
    new Set(allRefunds.map((entry) => entry.id)).size !== allRefunds.length
  )
    throw new TypeError('Sale history identities must be unique')
  allRefunds.forEach((refund) => {
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
      allRefunds.filter((entry) => entry.receiptId === receipt.id),
      receipt.totals.gross.currency,
    )
    if (total.minor > receipt.totals.gross.minor)
      throw new TypeError('Stored refunds exceed receipt total')
  }
  return history
}
export function parseSaleHistory(value: string | null): SaleHistory {
  if (!value) return emptyHistory()
  try {
    return validateSaleHistory(JSON.parse(value) as SaleHistory)
  } catch {
    try {
      const raw = JSON.parse(value) as Partial<SaleHistory>
      let salvaged = emptyHistory()
      for (const receipt of Array.isArray(raw.receipts) ? raw.receipts : []) {
        try {
          salvaged = appendReceipt(salvaged, receipt)
        } catch {
          /* quarantine invalid receipt */
        }
      }
      for (const refund of Array.isArray(raw.refunds) ? raw.refunds : []) {
        try {
          validateRefund(refund)
          const candidate = {
            ...salvaged,
            refunds: [...salvaged.refunds, refund],
          }
          validateSaleHistory(candidate)
          salvaged = candidate
        } catch {
          /* quarantine invalid or conflicting refund */
        }
      }
      for (const event of Array.isArray(raw.pendingRefunds)
        ? raw.pendingRefunds
        : []) {
        try {
          salvaged = stageRefund(salvaged, event)
        } catch {
          /* quarantine invalid pending event */
        }
      }
      return salvaged
    } catch {
      return emptyHistory()
    }
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
  const existing = history.receipts.find((entry) => entry.id === receipt.id)
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(receipt))
      throw new TypeError('Receipt identity collision')
    return history
  }
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
