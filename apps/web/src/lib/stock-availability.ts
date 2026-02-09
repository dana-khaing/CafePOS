import type { Inventory, Menu, MenuItem } from '@cafepos/domain'

export type StockIngredientState = Readonly<{
  stockItemId: string
  name: string
  quantity: number
  reorderAt: number
}>

export type MenuItemStockState = Readonly<{
  manualAvailable: boolean
  inStock: boolean
  sellable: boolean
  lowStock: boolean
  soldOut: boolean
  lowStockIngredients: readonly StockIngredientState[]
  soldOutIngredients: readonly StockIngredientState[]
}>

const emptyStockState = (manualAvailable: boolean): MenuItemStockState => ({
  manualAvailable,
  inStock: true,
  sellable: manualAvailable,
  lowStock: false,
  soldOut: false,
  lowStockIngredients: [],
  soldOutIngredients: [],
})

export function getMenuItemStockState(
  item: MenuItem,
  inventory: Inventory,
): MenuItemStockState {
  const recipe = inventory.recipes.find((entry) => entry.menuItemId === item.id)
  if (!recipe) return emptyStockState(item.available)

  const stockById = new Map(inventory.items.map((entry) => [entry.id, entry]))
  const ingredientStates = Object.entries(recipe.ingredients)
    .map(([stockItemId, requiredAmount]) => {
      const stockItem = stockById.get(stockItemId)
      return {
        stockItemId,
        name: stockItem?.name ?? stockItemId,
        quantity: stockItem?.quantity ?? 0,
        reorderAt: stockItem?.reorderAt ?? 0,
        requiredAmount,
      }
    })
    .sort(
      (left, right) =>
        left.quantity - right.quantity || left.name.localeCompare(right.name),
    )

  const soldOutIngredients = ingredientStates.filter(
    (entry) => entry.quantity < entry.requiredAmount,
  )
  const lowStockIngredients = ingredientStates.filter(
    (entry) =>
      entry.quantity >= entry.requiredAmount &&
      entry.quantity > 0 &&
      entry.quantity <= entry.reorderAt,
  )
  const inStock = soldOutIngredients.length === 0
  return {
    manualAvailable: item.available,
    inStock,
    sellable: item.available && inStock,
    lowStock: inStock && lowStockIngredients.length > 0,
    soldOut: !inStock,
    lowStockIngredients,
    soldOutIngredients,
  }
}

export function buildMenuStockState(menu: Menu, inventory: Inventory) {
  return Object.fromEntries(
    menu.items.map((item) => [item.id, getMenuItemStockState(item, inventory)]),
  ) as Readonly<Record<string, MenuItemStockState>>
}

export function getMenuItemsAtRisk(menu: Menu, inventory: Inventory) {
  return menu.items
    .map((item) => ({
      item,
      stock: getMenuItemStockState(item, inventory),
    }))
    .filter(({ stock }) => stock.lowStock || stock.soldOut)
}
