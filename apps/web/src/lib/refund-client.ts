import {
  type Receipt,
  type SyncEvent,
  validateReceipt,
  validateRefundEvent,
} from '@cafepos/domain'

export async function enqueueRefund(
  receipt: Receipt,
  event: SyncEvent,
  managerPin: string,
  fetcher: typeof fetch = fetch,
  hubUrl = process.env.NEXT_PUBLIC_BRANCH_HUB_URL ?? 'http://127.0.0.1:4310',
  token = process.env.NEXT_PUBLIC_BRANCH_HUB_TOKEN ?? '',
) {
  validateReceipt(receipt)
  validateRefundEvent(event)
  const response = await fetcher(`${hubUrl}/v1/refunds`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'x-manager-pin': managerPin,
    },
    body: JSON.stringify({ receipt, event }),
  })
  if (!response.ok)
    throw new Error(`Refund queue rejected (${response.status})`)
}
