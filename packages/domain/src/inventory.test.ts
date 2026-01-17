import { describe, expect, it } from 'vitest'
import { adjustStock, consumeReceipt, validateInventory } from './inventory'

const inventory = {
  items: [
    {
      id: 'beans',
      name: 'Coffee beans',
      unit: 'g' as const,
      quantity: 1000,
      reorderAt: 200,
    },
  ],
  recipes: [{ menuItemId: 'latte', ingredients: { beans: 18 } }],
  adjustments: [],
  consumedReceiptIds: [],
  version: 1,
}
const receipt = {
  id: 'r1',
  order: { lines: [{ itemId: 'latte', quantity: 2 }] },
}

describe('inventory', () => {
  it('consumes recipes once per receipt', () => {
    const once = consumeReceipt(inventory, receipt as never)
    expect(once.items[0]?.quantity).toBe(964)
    expect(consumeReceipt(once, receipt as never)).toBe(once)
  })
  it('requires managers and prevents negative stock', () => {
    const adjustment = {
      id: 'a',
      stockItemId: 'beans',
      delta: 10,
      reason: 'Count',
      actorId: 'm',
      occurredAt: '2026-01-17T10:00:00Z',
    }
    expect(() => adjustStock(inventory, adjustment, 'cashier')).toThrow(
      'manager',
    )
    expect(
      adjustStock(inventory, adjustment, 'manager').items[0]?.quantity,
    ).toBe(1010)
    expect(() =>
      adjustStock(
        inventory,
        { ...adjustment, id: 'b', delta: -2000 },
        'manager',
      ),
    ).toThrow('Stock item')
  })
  it('rejects duplicate identities', () => {
    expect(() =>
      validateInventory({
        ...inventory,
        items: [...inventory.items, inventory.items[0]!],
      }),
    ).toThrow('unique')
  })
})
