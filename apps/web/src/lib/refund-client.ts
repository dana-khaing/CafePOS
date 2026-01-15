import { type SyncEvent, validateRefundEvent } from '@cafepos/domain'

export async function enqueueRefund(
  event: SyncEvent,
  fetcher: typeof fetch = fetch,
  hubUrl = process.env.NEXT_PUBLIC_BRANCH_HUB_URL ?? 'http://127.0.0.1:4310',
  token = process.env.NEXT_PUBLIC_BRANCH_HUB_TOKEN ?? '',
) {
  validateRefundEvent(event)
  const response = await fetcher(`${hubUrl}/v1/refunds`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(event),
  })
  if (!response.ok)
    throw new Error(`Refund queue rejected (${response.status})`)
}
