import { money, type Menu, validateMenu } from '@cafepos/domain'

export const MENU_STORAGE_KEY = 'cafepos.menu.v1'

export function defaultMenu(): Menu {
  return {
    currency: 'THB',
    categories: [
      { id: 'coffee', name: { en: 'Coffee', th: 'กาแฟ' }, sortOrder: 0 },
      { id: 'tea', name: { en: 'Tea', th: 'ชา' }, sortOrder: 1 },
      { id: 'bakery', name: { en: 'Bakery', th: 'เบเกอรี่' }, sortOrder: 2 },
    ],
    modifierGroups: [
      {
        id: 'milk',
        name: { en: 'Milk choice', th: 'เลือกนม' },
        minimum: 0,
        maximum: 1,
        options: [
          {
            id: 'oat',
            name: { en: 'Oat milk', th: 'นมโอ๊ต' },
            priceDelta: money(2000),
            available: true,
          },
          {
            id: 'soy',
            name: { en: 'Soy milk', th: 'นมถั่วเหลือง' },
            priceDelta: money(1500),
            available: true,
          },
        ],
      },
      {
        id: 'size',
        name: { en: 'Size', th: 'ขนาด' },
        minimum: 1,
        maximum: 1,
        options: [
          {
            id: 'regular',
            name: { en: 'Regular', th: 'ปกติ' },
            priceDelta: money(0),
            available: true,
          },
          {
            id: 'large',
            name: { en: 'Large', th: 'ใหญ่' },
            priceDelta: money(2500),
            available: true,
          },
        ],
      },
    ],
    items: [
      {
        id: 'espresso',
        categoryId: 'coffee',
        sku: 'COF-ESP',
        name: { en: 'Espresso', th: 'เอสเปรสโซ' },
        price: money(8000),
        taxRateId: 'vat7',
        available: true,
        modifierGroupIds: ['size'],
      },
      {
        id: 'latte',
        categoryId: 'coffee',
        sku: 'COF-LAT',
        name: { en: 'Café latte', th: 'คาเฟ่ลาเต้' },
        price: money(12000),
        taxRateId: 'vat7',
        available: true,
        modifierGroupIds: ['milk', 'size'],
      },
      {
        id: 'cold-brew',
        categoryId: 'coffee',
        sku: 'COF-CBR',
        name: { en: 'Cold brew', th: 'โคลด์บรูว์' },
        price: money(13500),
        taxRateId: 'vat7',
        available: false,
        modifierGroupIds: ['size'],
      },
      {
        id: 'thai-tea',
        categoryId: 'tea',
        sku: 'TEA-THA',
        name: { en: 'Thai milk tea', th: 'ชาไทย' },
        price: money(9500),
        taxRateId: 'vat7',
        available: true,
        modifierGroupIds: ['milk', 'size'],
      },
      {
        id: 'matcha',
        categoryId: 'tea',
        sku: 'TEA-MAT',
        name: { en: 'Matcha latte', th: 'มัทฉะลาเต้' },
        price: money(13000),
        taxRateId: 'vat7',
        available: true,
        modifierGroupIds: ['milk', 'size'],
      },
      {
        id: 'croissant',
        categoryId: 'bakery',
        sku: 'BAK-CRO',
        name: { en: 'Butter croissant', th: 'ครัวซองต์เนย' },
        price: money(9000),
        taxRateId: 'vat7',
        available: true,
        modifierGroupIds: [],
      },
    ],
  }
}

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
