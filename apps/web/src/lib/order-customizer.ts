import type {
  LocalizedText,
  MenuItem,
  ModifierGroup,
  OrderLineModifier,
} from '@cafepos/domain'

export type ModifierSelections = Readonly<Record<string, readonly string[]>>

export type SelectedModifierGroup = Readonly<{
  group: ModifierGroup
  selectedOptionIds: readonly string[]
}>

function normalizeSelectedOptionIds(
  group: ModifierGroup,
  selectedOptionIds: readonly string[] | undefined,
): readonly string[] {
  const selected = new Set(selectedOptionIds ?? [])
  return group.options
    .filter((option) => option.available && selected.has(option.id))
    .map((option) => option.id)
}

export function partitionModifierGroups(
  item: MenuItem,
  groupsById: ReadonlyMap<string, ModifierGroup>,
  selections: ModifierSelections,
): Readonly<{
  required: readonly SelectedModifierGroup[]
  optional: readonly SelectedModifierGroup[]
}> {
  const groups = item.modifierGroupIds
    .map((groupId) => groupsById.get(groupId))
    .filter((group): group is ModifierGroup => Boolean(group))

  const selectedGroups = groups.map((group) => ({
    group,
    selectedOptionIds: normalizeSelectedOptionIds(group, selections[group.id]),
  }))

  return {
    required: selectedGroups.filter(({ group }) => group.minimum > 0),
    optional: selectedGroups.filter(({ group }) => group.minimum === 0),
  }
}

export function getModifierGroupSelection(
  group: ModifierGroup,
  selections: ModifierSelections,
): readonly string[] {
  return normalizeSelectedOptionIds(group, selections[group.id])
}

export function isModifierGroupSatisfied(
  group: ModifierGroup,
  selectedOptionIds: readonly string[],
): boolean {
  return (
    normalizeSelectedOptionIds(group, selectedOptionIds).length >= group.minimum
  )
}

export function isItemCustomizationComplete(
  item: MenuItem,
  groupsById: ReadonlyMap<string, ModifierGroup>,
  selections: ModifierSelections,
): boolean {
  return item.modifierGroupIds.every((groupId) => {
    const group = groupsById.get(groupId)
    if (!group) return true
    return isModifierGroupSatisfied(group, selections[groupId] ?? [])
  })
}

export function buildOrderLineModifiers(
  item: MenuItem,
  groupsById: ReadonlyMap<string, ModifierGroup>,
  selections: ModifierSelections,
  label: (text: LocalizedText) => string,
): readonly OrderLineModifier[] {
  return item.modifierGroupIds.flatMap((groupId) => {
    const group = groupsById.get(groupId)
    if (!group) return []
    const selected = normalizeSelectedOptionIds(group, selections[groupId])
    return selected.flatMap((optionId) => {
      const option = group.options.find((entry) => entry.id === optionId)
      if (!option) return []
      return [
        {
          optionId: option.id,
          name: label(option.name),
          priceDelta: option.priceDelta,
        },
      ]
    })
  })
}

export function getGroupSelectionSummary(
  group: ModifierGroup,
  selectedOptionIds: readonly string[],
): Readonly<{
  selectedCount: number
  minimum: number
  maximum: number
}> {
  const selectedCount = normalizeSelectedOptionIds(
    group,
    selectedOptionIds,
  ).length
  return {
    selectedCount,
    minimum: group.minimum,
    maximum: group.maximum,
  }
}
