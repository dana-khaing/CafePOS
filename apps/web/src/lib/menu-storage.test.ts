import { describe, expect, it } from 'vitest'

import { createEmptyMenu } from '@cafepos/domain'

import { parseStoredMenu, serializeMenu } from './menu-storage'

describe('local menu storage', () => {
  it('round trips a validated menu', () => {
    const menu = createEmptyMenu('THB')
    expect(
      parseStoredMenu(serializeMenu(menu), createEmptyMenu('MMK')),
    ).toEqual(menu)
  })

  it('falls back when local data is malformed or invalid', () => {
    const fallback = createEmptyMenu('THB')
    expect(parseStoredMenu('{', fallback)).toBe(fallback)
    expect(
      parseStoredMenu(
        JSON.stringify({ ...fallback, currency: 'USD' }),
        fallback,
      ),
    ).toBe(fallback)
  })
})
