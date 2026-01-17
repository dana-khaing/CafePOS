import type { MembershipRole } from './access.js'
import type { Receipt } from './receipt.js'

export type StockItem = Readonly<{
  id: string
  name: string
  unit: 'g' | 'ml' | 'each'
  quantity: number
  reorderAt: number
}>
export type Recipe = Readonly<{
  menuItemId: string
  ingredients: Readonly<Record<string, number>>
}>
export type StockAdjustment = Readonly<{
  id: string
  stockItemId: string
  delta: number
  reason: string
  actorId: string
  occurredAt: string
}>
export type Inventory = Readonly<{
  items: readonly StockItem[]
  recipes: readonly Recipe[]
  adjustments: readonly StockAdjustment[]
  consumedReceiptIds: readonly string[]
  version: number
}>

export function validateInventory(value: Inventory): Inventory {
  if (!Number.isSafeInteger(value.version) || value.version < 1)
    throw new TypeError('Inventory version is invalid')
  if (new Set(value.items.map((item) => item.id)).size !== value.items.length)
    throw new TypeError('Stock item ids must be unique')
  if (
    new Set(value.consumedReceiptIds).size !== value.consumedReceiptIds.length
  )
    throw new TypeError('Consumed receipt ids must be unique')
  for (const item of value.items) {
    if (
      !item.id.trim() ||
      !item.name.trim() ||
      !['g', 'ml', 'each'].includes(item.unit) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 0 ||
      !Number.isSafeInteger(item.reorderAt) ||
      item.reorderAt < 0
    )
      throw new TypeError('Stock item is invalid')
  }
  const ids = new Set(value.items.map((item) => item.id))
  for (const recipe of value.recipes) {
    if (!recipe.menuItemId.trim()) throw new TypeError('Recipe is invalid')
    for (const [id, amount] of Object.entries(recipe.ingredients))
      if (!ids.has(id) || !Number.isSafeInteger(amount) || amount < 1)
        throw new TypeError('Recipe ingredient is invalid')
  }
  for (const entry of value.adjustments)
    if (
      !entry.id.trim() ||
      !ids.has(entry.stockItemId) ||
      !Number.isSafeInteger(entry.delta) ||
      entry.delta === 0 ||
      !entry.reason.trim() ||
      !entry.actorId.trim() ||
      Number.isNaN(Date.parse(entry.occurredAt))
    )
      throw new TypeError('Stock adjustment is invalid')
  return value
}

export function adjustStock(
  inventory: Inventory,
  adjustment: StockAdjustment,
  actorRole: MembershipRole,
) {
  validateInventory(inventory)
  if (!['owner', 'admin', 'manager'].includes(actorRole))
    throw new TypeError('Stock adjustment requires manager approval')
  if (inventory.adjustments.some((entry) => entry.id === adjustment.id))
    return inventory
  const items = inventory.items.map((item) =>
    item.id === adjustment.stockItemId
      ? { ...item, quantity: item.quantity + adjustment.delta }
      : item,
  )
  return validateInventory({
    ...inventory,
    items,
    adjustments: [...inventory.adjustments, adjustment],
    version: inventory.version + 1,
  })
}

export function consumeReceipt(inventory: Inventory, receipt: Receipt) {
  validateInventory(inventory)
  if (inventory.consumedReceiptIds.includes(receipt.id)) return inventory
  const deductions = new Map<string, number>()
  for (const line of receipt.order.lines) {
    const recipe = inventory.recipes.find(
      (entry) => entry.menuItemId === line.itemId,
    )
    if (!recipe) continue
    for (const [id, amount] of Object.entries(recipe.ingredients))
      deductions.set(id, (deductions.get(id) ?? 0) + amount * line.quantity)
  }
  const items = inventory.items.map((item) => ({
    ...item,
    quantity: item.quantity - (deductions.get(item.id) ?? 0),
  }))
  return validateInventory({
    ...inventory,
    items,
    consumedReceiptIds: [...inventory.consumedReceiptIds, receipt.id],
    version: inventory.version + 1,
  })
}
