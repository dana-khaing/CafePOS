import { describe, expect, it, vi } from 'vitest'

import { probeHub } from './hub-status'

describe('branch hub probe', () => {
  it('reports connected only for a ready hub response', async () => {
    const request = vi.fn(
      async () =>
        new Response(JSON.stringify({ status: 'ready' }), { status: 200 }),
    )
    expect(await probeHub('http://127.0.0.1:4310/', request)).toBe('connected')
    expect(request).toHaveBeenCalledWith(
      'http://127.0.0.1:4310/v1/status',
      expect.any(Object),
    )
  })

  it('fails closed for unhealthy or unreachable hubs', async () => {
    expect(
      await probeHub(
        'http://hub',
        async () => new Response('{}', { status: 503 }),
      ),
    ).toBe('disconnected')
    expect(
      await probeHub('http://hub', async () =>
        Promise.reject(new Error('offline')),
      ),
    ).toBe('disconnected')
  })
})
