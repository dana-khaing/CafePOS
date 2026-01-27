import { describe, expect, it, vi } from 'vitest'

import { probeHub } from './hub-status'

describe('branch hub probe', () => {
  it('reports connected only for a ready hub response', async () => {
    const request = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/v1/status')) {
        return new Response(
          JSON.stringify({
            status: 'ready',
            branch: { id: 'branch-riverside', name: 'Riverside Cafe' },
            publicOrigin: 'https://branch.local.cafepos.test',
            uptimeSeconds: 42,
          }),
          { status: 200 },
        )
      }
      return new Response(
        JSON.stringify({
          status: 'ready',
          outbox: { pending: 2, inflight: 1, total: 3 },
        }),
        {
          status: 200,
        },
      )
    })
    const result = await probeHub('http://127.0.0.1:4310/', request)
    expect(result.connection).toBe('connected')
    expect(result.branch).toEqual({
      id: 'branch-riverside',
      name: 'Riverside Cafe',
    })
    expect(result.sync).toEqual({ pending: 2, inflight: 1, total: 3 })
    expect(request).toHaveBeenCalledWith(
      'http://127.0.0.1:4310/v1/status',
      expect.any(Object),
    )
    expect(request).toHaveBeenCalledWith(
      'http://127.0.0.1:4310/v1/sync/status',
      expect.any(Object),
    )
  })

  it('fails closed for unhealthy or unreachable hubs', async () => {
    expect(
      await probeHub(
        'http://hub',
        async () => new Response('{}', { status: 503 }),
      ),
    ).toMatchObject({ connection: 'disconnected' })
    expect(
      await probeHub('http://hub', async () =>
        Promise.reject(new Error('offline')),
      ),
    ).toMatchObject({ connection: 'disconnected' })
    expect(
      await probeHub(
        'http://hub',
        async () =>
          new Response(JSON.stringify({ status: 'ready' }), { status: 200 }),
      ),
    ).toMatchObject({ connection: 'disconnected' })
  })
})
