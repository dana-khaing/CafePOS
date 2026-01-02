import { describe, expect, it } from 'vitest'

import manifest from './manifest'

describe('PWA manifest', () => {
  it('declares a standalone app shell and install icon', () => {
    const value = manifest()

    expect(value.display).toBe('standalone')
    expect(value.start_url).toBe('/')
    expect(value.icons).toContainEqual(
      expect.objectContaining({ src: '/icon.svg' }),
    )
  })
})
