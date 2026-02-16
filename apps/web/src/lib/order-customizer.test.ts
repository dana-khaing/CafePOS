import { describe, expect, it } from 'vitest'

import { money, type MenuItem, type ModifierGroup } from '@cafepos/domain'

import {
  buildOrderLineModifiers,
  getGroupSelectionSummary,
  isItemCustomizationComplete,
  partitionModifierGroups,
} from './order-customizer'

const categoryId = 'coffee'

const requiredGroup: ModifierGroup = {
  id: 'size',
  name: { en: 'Size' },
  minimum: 1,
  maximum: 1,
  options: [
    {
      id: 'small',
      name: { en: 'Small' },
      priceDelta: money(0),
      available: true,
    },
    {
      id: 'large',
      name: { en: 'Large' },
      priceDelta: money(250),
      available: true,
    },
  ],
}

const optionalGroup: ModifierGroup = {
  id: 'milk',
  name: { en: 'Milk' },
  minimum: 0,
  maximum: 2,
  options: [
    {
      id: 'oat',
      name: { en: 'Oat milk' },
      priceDelta: money(200),
      available: true,
    },
    {
      id: 'soy',
      name: { en: 'Soy milk' },
      priceDelta: money(150),
      available: false,
    },
  ],
}

const item: MenuItem = {
  id: 'latte',
  categoryId,
  sku: 'LAT-001',
  name: { en: 'Café latte' },
  price: money(1200),
  taxRateId: 'vat7',
  available: true,
  modifierGroupIds: [requiredGroup.id, optionalGroup.id],
}

const groupsById = new Map<string, ModifierGroup>([
  [requiredGroup.id, requiredGroup],
  [optionalGroup.id, optionalGroup],
])

describe('order customizer helpers', () => {
  it('keeps required groups separate from optional groups', () => {
    const result = partitionModifierGroups(item, groupsById, {})
    expect(result.required.map(({ group }) => group.id)).toEqual(['size'])
    expect(result.optional.map(({ group }) => group.id)).toEqual(['milk'])
  })

  it('tracks customization completeness without auto-selecting required options', () => {
    expect(isItemCustomizationComplete(item, groupsById, {})).toBe(false)
    expect(
      isItemCustomizationComplete(item, groupsById, {
        size: ['large'],
      }),
    ).toBe(true)
    expect(
      isItemCustomizationComplete(item, groupsById, {
        size: ['large'],
        milk: ['oat', 'soy'],
      }),
    ).toBe(true)
  })

  it('builds order line modifiers from the explicit selections only', () => {
    const modifiers = buildOrderLineModifiers(
      item,
      groupsById,
      {
        size: ['large'],
        milk: ['oat', 'soy'],
      },
      (text) => text.en,
    )

    expect(modifiers).toEqual([
      {
        optionId: 'large',
        name: 'Large',
        priceDelta: money(250),
      },
      {
        optionId: 'oat',
        name: 'Oat milk',
        priceDelta: money(200),
      },
    ])
  })

  it('summarizes the selected count after filtering unavailable options', () => {
    expect(getGroupSelectionSummary(optionalGroup, ['oat', 'soy'])).toEqual({
      selectedCount: 1,
      minimum: 0,
      maximum: 2,
    })
  })
})
