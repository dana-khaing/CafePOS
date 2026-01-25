import {
  money,
  setMenuItemAvailability,
  type Menu,
  type MenuCategory,
  type MenuItem,
  type ModifierGroup,
  type ModifierOption,
  validateMenu,
} from '@cafepos/domain'

function sortCategories(categories: readonly MenuCategory[]) {
  return [...categories].sort((left, right) => left.sortOrder - right.sortOrder)
}

export function saveMenuCategory(menu: Menu, category: MenuCategory): Menu {
  validateMenu(menu)
  const categories = menu.categories.some((entry) => entry.id === category.id)
    ? menu.categories.map((entry) =>
        entry.id === category.id ? category : entry,
      )
    : [...menu.categories, category]
  return validateMenu({ ...menu, categories: sortCategories(categories) })
}

export function removeMenuCategory(menu: Menu, categoryId: string): Menu {
  if (menu.items.some((item) => item.categoryId === categoryId)) {
    throw new TypeError('Category is used by one or more menu items')
  }
  return validateMenu({
    ...menu,
    categories: menu.categories.filter((entry) => entry.id !== categoryId),
  })
}

export function saveMenuItem(menu: Menu, item: MenuItem): Menu {
  validateMenu(menu)
  const items = menu.items.some((entry) => entry.id === item.id)
    ? menu.items.map((entry) => (entry.id === item.id ? item : entry))
    : [...menu.items, item]
  return validateMenu({ ...menu, items })
}

export function removeMenuItem(menu: Menu, itemId: string): Menu {
  return validateMenu({
    ...menu,
    items: menu.items.filter((entry) => entry.id !== itemId),
  })
}

export function saveModifierGroup(menu: Menu, group: ModifierGroup): Menu {
  validateMenu(menu)
  const groups = menu.modifierGroups.some((entry) => entry.id === group.id)
    ? menu.modifierGroups.map((entry) =>
        entry.id === group.id ? group : entry,
      )
    : [...menu.modifierGroups, group]
  return validateMenu({ ...menu, modifierGroups: groups })
}

export function addModifierGroupOption(
  menu: Menu,
  groupId: string,
  option: ModifierOption,
): Menu {
  const group = menu.modifierGroups.find((entry) => entry.id === groupId)
  if (!group) throw new TypeError('Modifier group not found')
  if (group.options.some((entry) => entry.id === option.id)) {
    throw new TypeError('Modifier option already exists')
  }
  return saveModifierGroup(menu, {
    ...group,
    options: [...group.options, option],
  })
}

export function removeModifierGroup(menu: Menu, groupId: string): Menu {
  if (menu.items.some((item) => item.modifierGroupIds.includes(groupId))) {
    throw new TypeError('Modifier group is used by one or more menu items')
  }
  return validateMenu({
    ...menu,
    modifierGroups: menu.modifierGroups.filter((entry) => entry.id !== groupId),
  })
}

export function setMenuItemVisibility(
  menu: Menu,
  itemId: string,
  available: boolean,
): Menu {
  return setMenuItemAvailability(menu, itemId, available)
}

export function parseMinorUnits(value: string, field: string) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0)
    throw new TypeError(`${field} must be a non-negative integer`)
  return parsed
}

export function parsePositiveInteger(value: string, field: string) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new TypeError(`${field} must be a positive integer`)
  return parsed
}

export function buildMoney(minor: number, currency: Menu['currency']) {
  return money(minor, currency)
}
