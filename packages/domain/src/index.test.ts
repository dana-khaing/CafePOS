import { describe, expect, it } from 'vitest'

import { PRODUCT_NAME } from './index.js'

describe('domain package', () => {
  it('exposes the shared product identity', () => {
    expect(PRODUCT_NAME).toBe('CafePOS')
  })
})
