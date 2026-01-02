import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

describe('service worker application shell', () => {
  it('precaches Next assets and falls back to the cached POS shell', async () => {
    const source = await readFile(
      new URL('../../public/sw.js', import.meta.url),
      'utf8',
    )

    expect(source).toContain("url.pathname.startsWith('/_next/static/')")
    expect(source).toContain("cache.put('/', response)")
    expect(source).toContain("caches.match('/')")
  })
})
