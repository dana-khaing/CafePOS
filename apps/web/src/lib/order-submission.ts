import {
  type SyncEvent,
  validateSubmittedOrderEvent,
  validateSyncEvent,
} from '@cafepos/domain'

export const PENDING_ORDER_SUBMISSION_KEY =
  'cafepos.pending-order-submission.v1'

export function parsePendingOrderSubmission(
  serialized: string | null,
): SyncEvent | null {
  if (!serialized) return null
  try {
    const event = JSON.parse(serialized) as SyncEvent
    validateSubmittedOrderEvent(event)
    return event
  } catch {
    return null
  }
}

export function serializePendingOrderSubmission(event: SyncEvent): string {
  validateSubmittedOrderEvent(event)
  return JSON.stringify(event)
}

export async function enqueueSubmittedOrder(
  event: SyncEvent,
  fetcher: typeof fetch = fetch,
  hubUrl = process.env.NEXT_PUBLIC_BRANCH_HUB_URL ?? 'http://127.0.0.1:4310',
  branchToken = process.env.NEXT_PUBLIC_BRANCH_HUB_TOKEN ?? '',
): Promise<void> {
  validateSyncEvent(event)
  const response = await fetcher(`${hubUrl}/v1/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${branchToken}`,
    },
    body: JSON.stringify(event),
  })
  if (!response.ok)
    throw new Error(`Branch hub rejected order (${response.status})`)
}
