import { describe, expect, it } from 'vitest'

import { money } from './money'
import { setMenuItemAvailability, type Menu, validateMenu } from './menu'

const menu: Menu = {
  currency: 'THB',
  categories: [
    { id: 'coffee', name: { en: 'Coffee', th: 'กาแฟ' }, sortOrder: 0 },
  ],
  modifierGroups: [
    {
      id: 'milk',
      name: { en: 'Milk' },
      minimum: 0,
      maximum: 1,
      options: [
        {
          id: 'oat',
          name: { en: 'Oat milk' },
          priceDelta: money(2000),
          available: true,
        },
      ],
    },
  ],
  items: [
    {
      id: 'latte',
      categoryId: 'coffee',
      sku: 'COF-LATTE',
      name: { en: 'Latte', th: 'ลาเต้' },
      price: money(12000),
      taxRateId: 'vat7',
      available: true,
      modifierGroupIds: ['milk'],
    },
  ],
}

describe('menu', () => {
  it('validates categories, items, prices, and modifier references', () => {
    expect(validateMenu(menu)).toBe(menu)
  })

  it('changes availability immutably', () => {
    const updated = setMenuItemAvailability(menu, 'latte', false)
    expect(updated.items[0].available).toBe(false)
    expect(menu.items[0].available).toBe(true)
  })

  it('rejects duplicate SKUs and missing relationships', () => {
    expect(() =>
      validateMenu({
        ...menu,
        items: [...menu.items, { ...menu.items[0], id: 'latte-2' }],
      }),
    ).toThrow('SKUs')
    expect(() =>
      validateMenu({
        ...menu,
        items: [{ ...menu.items[0], categoryId: 'missing' }],
      }),
    ).toThrow('category')
    expect(() =>
      validateMenu({
        ...menu,
        items: [{ ...menu.items[0], price: money(-1) }],
      }),
    ).toThrow('price')
  })
})
