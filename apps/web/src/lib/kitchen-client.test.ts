import { describe, expect, it, vi } from 'vitest'
import { advanceKitchenTicketAtHub, loadKitchenTickets } from './kitchen-client'

describe('kitchen client', () => {
  it('loads and advances branch tickets', async () => {
    const load = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ tickets: [] }), { status: 200 }),
      )
    await expect(loadKitchenTickets(load)).resolves.toEqual([])
    const ticket = { id: 'ticket-1', status: 'preparing' }
    const advance = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ticket }), { status: 200 }),
      )
    await expect(
      advanceKitchenTicketAtHub('ticket-1', advance),
    ).resolves.toEqual(ticket)
    expect(advance).toHaveBeenCalledWith(
      expect.stringContaining('ticket-1/advance'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('surfaces unavailable queues and malformed responses', async () => {
    await expect(
      loadKitchenTickets(
        vi.fn<typeof fetch>().mockResolvedValue(new Response('{}')),
      ),
    ).rejects.toThrow('invalid')
    await expect(
      loadKitchenTickets(
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response(null, { status: 503 })),
      ),
    ).rejects.toThrow('503')
  })
})
