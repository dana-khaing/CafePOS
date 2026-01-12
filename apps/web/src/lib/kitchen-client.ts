import { type KitchenTicket } from '@cafepos/domain'

const hubUrl = process.env.NEXT_PUBLIC_BRANCH_HUB_URL ?? 'http://127.0.0.1:4310'
const token = process.env.NEXT_PUBLIC_BRANCH_HUB_TOKEN ?? ''
const headers = { authorization: `Bearer ${token}` }

export async function loadKitchenTickets(fetcher: typeof fetch = fetch) {
  const response = await fetcher(`${hubUrl}/v1/kitchen/tickets`, { headers })
  if (!response.ok)
    throw new Error(`Kitchen queue unavailable (${response.status})`)
  const body = (await response.json()) as { tickets: KitchenTicket[] }
  if (!Array.isArray(body.tickets))
    throw new TypeError('Kitchen response is invalid')
  return body.tickets
}

export async function advanceKitchenTicketAtHub(
  ticketId: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(
    `${hubUrl}/v1/kitchen/tickets/${encodeURIComponent(ticketId)}/advance`,
    { method: 'POST', headers },
  )
  if (!response.ok)
    throw new Error(`Kitchen update failed (${response.status})`)
  return ((await response.json()) as { ticket: KitchenTicket }).ticket
}
