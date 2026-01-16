import { describe, expect, it, vi } from 'vitest'
import { verifyManagerPin } from './manager-client'
describe('manager approval client', () => {
  it('sends approval only to the branch hub and rejects denial', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }))
    await verifyManagerPin('2468', fetcher, 'http://hub.test', 'token')
    expect(fetcher).toHaveBeenCalledWith(
      'http://hub.test/v1/manager/verify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-manager-pin': '2468' }),
      }),
    )
    await expect(
      verifyManagerPin(
        '2468',
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response(null, { status: 403 })),
        'http://hub.test',
        'token',
      ),
    ).rejects.toThrow('403')
  })
  it('rejects malformed pins before transport', async () => {
    await expect(verifyManagerPin('2e4')).rejects.toThrow('format')
  })
})
