import { type SyncEvent, validateSyncEvent } from '@cafepos/domain'

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
