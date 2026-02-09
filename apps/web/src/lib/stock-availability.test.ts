import { describe, expect, it } from 'vitest'

import { defaultMenu } from './menu-storage'
import { initialInventory } from './inventory-storage'
import {
  buildMenuStockState,
  getMenuItemStockState,
  getMenuItemsAtRisk,
} from './stock-availability'

describe('stock availability', () => {
  it('marks a recipe item unavailable when any required ingredient runs out', () => {
    const inventory = {
      ...initialInventory(),
      items: initialInventory().items.map((item) =>
        item.id === 'milk' ? { ...item, quantity: 0 } : item,
      ),
    }
    const state = getMenuItemStockState(
      defaultMenu().items.find((item) => item.id === 'latte')!,
      inventory,
    )

    expect(state.soldOut).toBe(true)
    expect(state.sellable).toBe(false)
    expect(
      state.soldOutIngredients.map((entry) => entry.stockItemId),
    ).toContain('milk')
  })

  it('warns when ingredient stock is low but still available', () => {
    const inventory = {
      ...initialInventory(),
      items: initialInventory().items.map((item) =>
        item.id === 'milk' ? { ...item, quantity: 2500 } : item,
      ),
    }
    const state = getMenuItemStockState(
      defaultMenu().items.find((item) => item.id === 'latte')!,
      inventory,
    )

    expect(state.lowStock).toBe(true)
    expect(state.sellable).toBe(true)
  })

  it('keeps manually unavailable items hidden even when stock is available', () => {
    const menu = defaultMenu()
    const inventory = initialInventory()
    const item = { ...menu.items[0]!, available: false }

    const state = getMenuItemStockState(item, inventory)

    expect(state.manualAvailable).toBe(false)
    expect(state.sellable).toBe(false)
    expect(state.soldOut).toBe(false)
  })

  it('builds an at-risk list for the inventory dashboard', () => {
    const menu = defaultMenu()
    const inventory = {
      ...initialInventory(),
      items: initialInventory().items.map((item) =>
        item.id === 'beans' ? { ...item, quantity: 900 } : item,
      ),
    }

    expect(buildMenuStockState(menu, inventory)).toHaveProperty('latte')
    expect(getMenuItemsAtRisk(menu, inventory).length).toBeGreaterThan(0)
  })
})
