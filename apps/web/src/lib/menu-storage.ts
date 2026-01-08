import { type Menu, validateMenu } from '@cafepos/domain'

export const MENU_STORAGE_KEY = 'cafepos.menu.v1'

export function parseStoredMenu(
  serialized: string | null,
  fallback: Menu,
): Menu {
  if (!serialized) return fallback
  try {
    return validateMenu(JSON.parse(serialized) as Menu)
  } catch {
    return fallback
  }
}

export function serializeMenu(menu: Menu): string {
  return JSON.stringify(validateMenu(menu))
}
