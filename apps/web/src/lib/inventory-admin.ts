import {
  type Inventory,
  type StockItem,
  validateInventory,
} from '@cafepos/domain'

export function saveStockItem(
  inventory: Inventory,
  item: StockItem,
): Inventory {
  validateInventory(inventory)
  const items = inventory.items.some((entry) => entry.id === item.id)
    ? inventory.items.map((entry) => (entry.id === item.id ? item : entry))
    : [...inventory.items, item]
  return validateInventory({
    ...inventory,
    items,
    version: inventory.version + 1,
  })
}
