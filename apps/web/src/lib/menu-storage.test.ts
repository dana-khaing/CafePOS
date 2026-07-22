import { describe, expect, it } from 'vitest'

import { defaultMenu, parseStoredMenu, serializeMenu } from './menu-storage'

describe('local menu storage', () => {
  it('round trips a validated menu', () => {
    const menu = defaultMenu()
    expect(parseStoredMenu(serializeMenu(menu), defaultMenu())).toEqual(menu)
  })

  it('falls back when local data is malformed or invalid', () => {
    const fallback = defaultMenu()
    expect(parseStoredMenu('{', fallback)).toBe(fallback)
    expect(
      parseStoredMenu(
        JSON.stringify({ ...fallback, currency: 'USD' }),
        fallback,
      ),
    ).toBe(fallback)
    expect(
      parseStoredMenu(
        JSON.stringify({
          ...fallback,
          items: [
            {
              id: 'forged',
              categoryId: 'coffee',
              sku: 'FORGED',
              name: { en: 'Forged' },
              price: { currency: 'THB', minor: 10.5 },
              taxRateId: 'vat7',
              available: 'true',
              modifierGroupIds: [],
            },
          ],
          categories: [{ id: 'coffee', name: { en: 'Coffee' }, sortOrder: 0 }],
        }),
        fallback,
      ),
    ).toBe(fallback)
  })
})
