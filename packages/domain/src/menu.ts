import { money, type Money } from './money.js'

export type LocalizedText = Readonly<{ en: string; th?: string }>

export type MenuCategory = Readonly<{
  id: string
  name: LocalizedText
  sortOrder: number
}>

export type ModifierOption = Readonly<{
  id: string
  name: LocalizedText
  priceDelta: Money
  available: boolean
}>

export type ModifierGroup = Readonly<{
  id: string
  name: LocalizedText
  minimum: number
  maximum: number
  options: readonly ModifierOption[]
}>

export type MenuItem = Readonly<{
  id: string
  categoryId: string
  sku: string
  name: LocalizedText
  price: Money
  taxRateId: string
  available: boolean
  modifierGroupIds: readonly string[]
}>

export type Menu = Readonly<{
  currency: Money['currency']
  categories: readonly MenuCategory[]
  items: readonly MenuItem[]
  modifierGroups: readonly ModifierGroup[]
}>

function required(value: string, field: string) {
  if (!value.trim()) throw new TypeError(`${field} is required`)
}

function validateName(name: LocalizedText, field: string) {
  required(name.en, `${field} English name`)
  if (name.th !== undefined) required(name.th, `${field} Thai name`)
}

function unique(values: readonly string[], field: string) {
  if (new Set(values).size !== values.length)
    throw new TypeError(`${field} must be unique`)
}

export function validateMenu(menu: Menu): Menu {
  if (menu.currency !== 'THB' && menu.currency !== 'MMK') {
    throw new TypeError('Menu currency is unsupported')
  }
  unique(
    menu.categories.map((category) => category.id),
    'Category IDs',
  )
  unique(
    menu.items.map((item) => item.id),
    'Item IDs',
  )
  unique(
    menu.items.map((item) => item.sku),
    'Item SKUs',
  )
  unique(
    menu.modifierGroups.map((group) => group.id),
    'Modifier group IDs',
  )
  const categoryIds = new Set(menu.categories.map((category) => category.id))
  const groupIds = new Set(menu.modifierGroups.map((group) => group.id))

  for (const category of menu.categories) {
    required(category.id, 'Category id')
    validateName(category.name, 'Category')
    if (!Number.isSafeInteger(category.sortOrder) || category.sortOrder < 0) {
      throw new RangeError('Category sort order must be a non-negative integer')
    }
  }
  for (const group of menu.modifierGroups) {
    required(group.id, 'Modifier group id')
    validateName(group.name, 'Modifier group')
    if (
      !Number.isSafeInteger(group.minimum) ||
      !Number.isSafeInteger(group.maximum) ||
      group.minimum < 0 ||
      group.maximum < group.minimum
    ) {
      throw new RangeError('Modifier selection bounds are invalid')
    }
    if (group.maximum > group.options.length) {
      throw new RangeError('Modifier maximum exceeds option count')
    }
    unique(
      group.options.map((option) => option.id),
      'Modifier option IDs',
    )
    for (const option of group.options) {
      required(option.id, 'Modifier option id')
      validateName(option.name, 'Modifier option')
      if (typeof option.available !== 'boolean') {
        throw new TypeError('Modifier availability must be boolean')
      }
      if (
        option.priceDelta.currency !== menu.currency ||
        !Number.isSafeInteger(option.priceDelta.minor) ||
        option.priceDelta.minor < 0
      ) {
        throw new TypeError(
          'Modifier price must be non-negative in menu currency',
        )
      }
    }
  }
  for (const item of menu.items) {
    required(item.id, 'Item id')
    required(item.sku, 'Item SKU')
    required(item.taxRateId, 'Tax rate id')
    validateName(item.name, 'Item')
    if (!categoryIds.has(item.categoryId))
      throw new TypeError('Item category does not exist')
    if (typeof item.available !== 'boolean') {
      throw new TypeError('Item availability must be boolean')
    }
    if (
      item.price.currency !== menu.currency ||
      !Number.isSafeInteger(item.price.minor) ||
      item.price.minor < 0
    ) {
      throw new TypeError('Item price must be non-negative in menu currency')
    }
    unique(item.modifierGroupIds, 'Item modifier groups')
    if (item.modifierGroupIds.some((id) => !groupIds.has(id))) {
      throw new TypeError('Item modifier group does not exist')
    }
  }
  return menu
}

export function setMenuItemAvailability(
  menu: Menu,
  itemId: string,
  available: boolean,
): Menu {
  if (!menu.items.some((item) => item.id === itemId))
    throw new Error(`Menu item not found: ${itemId}`)
  return validateMenu({
    ...menu,
    items: menu.items.map((item) =>
      item.id === itemId ? { ...item, available } : item,
    ),
  })
}

export function createEmptyMenu(currency: Money['currency'] = 'THB'): Menu {
  return { currency, categories: [], items: [], modifierGroups: [] }
}

export const zeroPrice = (currency: Money['currency'] = 'THB') =>
  money(0, currency)
