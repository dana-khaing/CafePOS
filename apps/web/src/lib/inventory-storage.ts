import {
  consumeReceipt,
  type Inventory,
  type Receipt,
  validateInventory,
} from '@cafepos/domain'

export const INVENTORY_STORAGE_KEY = 'cafepos.inventory.v1'
export const initialInventory = (): Inventory => ({
  items: [
    {
      id: 'beans',
      name: 'Coffee beans',
      unit: 'g',
      quantity: 5000,
      reorderAt: 1000,
    },
    {
      id: 'milk',
      name: 'Fresh milk',
      unit: 'ml',
      quantity: 12000,
      reorderAt: 3000,
    },
    {
      id: 'tea',
      name: 'Thai tea leaves',
      unit: 'g',
      quantity: 2000,
      reorderAt: 400,
    },
    {
      id: 'matcha',
      name: 'Matcha powder',
      unit: 'g',
      quantity: 1000,
      reorderAt: 200,
    },
    {
      id: 'croissant',
      name: 'Croissants',
      unit: 'each',
      quantity: 40,
      reorderAt: 10,
    },
  ],
  recipes: [
    { menuItemId: 'espresso', ingredients: { beans: 18 } },
    { menuItemId: 'latte', ingredients: { beans: 18, milk: 220 } },
    { menuItemId: 'cold-brew', ingredients: { beans: 22 } },
    { menuItemId: 'thai-tea', ingredients: { tea: 20, milk: 80 } },
    { menuItemId: 'matcha', ingredients: { matcha: 5, milk: 200 } },
    { menuItemId: 'croissant', ingredients: { croissant: 1 } },
  ],
  adjustments: [],
  consumedReceiptIds: [],
  version: 1,
})
export function parseInventory(raw: string | null) {
  return raw
    ? validateInventory(JSON.parse(raw) as Inventory)
    : initialInventory()
}
export const serializeInventory = (value: Inventory) =>
  JSON.stringify(validateInventory(value))
export async function updateStoredInventory(
  storage: Storage,
  update: (inventory: Inventory) => Inventory,
  locks: LockManager | null | undefined = globalThis.navigator?.locks,
) {
  if (!locks)
    throw new TypeError('Browser-wide inventory locking is unavailable')
  return locks.request(INVENTORY_STORAGE_KEY, () => {
    const next = update(parseInventory(storage.getItem(INVENTORY_STORAGE_KEY)))
    storage.setItem(INVENTORY_STORAGE_KEY, serializeInventory(next))
    return next
  })
}
export const consumeStoredReceipt = (storage: Storage, receipt: Receipt) =>
  updateStoredInventory(storage, (inventory) =>
    consumeReceipt(inventory, receipt),
  )
