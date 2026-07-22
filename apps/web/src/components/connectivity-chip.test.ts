import { describe, expect, it } from 'vitest'

import { formatHubCheckedAt } from './connectivity-chip'

describe('connectivity chip timestamp formatting', () => {
  it('renders a stable UTC time string', () => {
    expect(formatHubCheckedAt('2026-07-22T18:27:31.000Z')).toBe('18:27:31')
  })
})
