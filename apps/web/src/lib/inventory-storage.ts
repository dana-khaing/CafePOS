import {
  consumeReceipt,
  type Inventory,
  type Receipt,
  validateInventory,
  validateReceipt,
} from '@cafepos/domain'

export const INVENTORY_STORAGE_KEY = 'cafepos.inventory.v1'
export const PENDING_INVENTORY_RECEIPTS_KEY = 'cafepos.inventory-pending.v1'
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
  consumedReceiptFingerprints: {},
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
export function salvagePendingInventoryReceipts(storage: Storage): Receipt[] {
  const raw = storage.getItem(PENDING_INVENTORY_RECEIPTS_KEY)
  if (!raw) return []
  try {
    const candidates = JSON.parse(raw) as unknown
    if (!Array.isArray(candidates))
      throw new TypeError('Pending inventory queue is invalid')
    const valid: Receipt[] = []
    const invalid: unknown[] = []
    for (const candidate of candidates) {
      try {
        valid.push(validateReceipt(candidate as Receipt))
      } catch {
        invalid.push(candidate)
      }
    }
    if (invalid.length)
      storage.setItem(
        `${PENDING_INVENTORY_RECEIPTS_KEY}.quarantine`,
        JSON.stringify(invalid),
      )
    return valid
  } catch {
    storage.setItem(`${PENDING_INVENTORY_RECEIPTS_KEY}.quarantine`, raw)
    return []
  }
}
export async function stageInventoryReceipt(
  storage: Storage,
  receipt: Receipt,
  locks: LockManager | null | undefined = globalThis.navigator?.locks,
) {
  validateReceipt(receipt)
  if (!locks)
    throw new TypeError('Browser-wide inventory locking is unavailable')
  await locks.request(INVENTORY_STORAGE_KEY, () => {
    const pending = salvagePendingInventoryReceipts(storage)
    const existing = pending.find((entry) => entry.id === receipt.id)
    if (existing && JSON.stringify(existing) !== JSON.stringify(receipt))
      throw new TypeError('Pending inventory receipt id conflicts')
    if (!existing)
      storage.setItem(
        PENDING_INVENTORY_RECEIPTS_KEY,
        JSON.stringify([...pending, receipt]),
      )
  })
}
export async function consumePendingInventory(
  storage: Storage,
  locks: LockManager | null | undefined = globalThis.navigator?.locks,
) {
  if (!locks)
    throw new TypeError('Browser-wide inventory locking is unavailable')
  await locks.request(INVENTORY_STORAGE_KEY, () => {
    const pending = salvagePendingInventoryReceipts(storage)
    if (!pending.length) {
      storage.removeItem(PENDING_INVENTORY_RECEIPTS_KEY)
      return
    }
    const current = parseInventory(storage.getItem(INVENTORY_STORAGE_KEY))
    const next = pending.reduce(consumeReceipt, current)
    storage.setItem(INVENTORY_STORAGE_KEY, serializeInventory(next))
    storage.removeItem(PENDING_INVENTORY_RECEIPTS_KEY)
  })
}
