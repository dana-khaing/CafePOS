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
    const ticket = {
      id: 'ticket-1',
      orderId: 'order-1',
      branchId: 'branch-1',
      status: 'preparing',
      diningMode: 'takeaway',
      version: 2,
      createdAt: '2026-01-12T10:00:00.000Z',
      updatedAt: '2026-01-12T10:01:00.000Z',
      lines: [{ id: 'line-1', name: 'Latte', quantity: 1, modifiers: [] }],
    }
    const advance = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ticket }), { status: 200 }),
      )
    await expect(
      advanceKitchenTicketAtHub('ticket-1', 'queued', advance),
    ).resolves.toEqual(ticket)
    expect(advance).toHaveBeenCalledWith(
      expect.stringContaining('ticket-1/advance'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(advance.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ expectedStatus: 'queued' }),
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
    await expect(
      loadKitchenTickets(
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response(JSON.stringify({ tickets: [{ id: 'forged' }] })),
          ),
      ),
    ).rejects.toThrow()
  })
})
