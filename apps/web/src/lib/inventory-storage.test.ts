import { describe, expect, it } from 'vitest'
import {
  initialInventory,
  parseInventory,
  serializeInventory,
  updateStoredInventory,
  salvagePendingInventoryReceipts,
  PENDING_INVENTORY_RECEIPTS_KEY,
} from './inventory-storage'

describe('inventory storage', () => {
  it('round trips validated inventory and rejects corruption', () => {
    const value = initialInventory()
    expect(parseInventory(serializeInventory(value))).toEqual(value)
    expect(() => parseInventory('{')).toThrow()
  })
  it('does not write without cross-tab locking', async () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } as unknown as Storage
    await expect(
      updateStoredInventory(storage, (value) => value, null),
    ).rejects.toThrow('locking')
    expect(values.size).toBe(0)
  })
  it('quarantines a corrupt projection queue without throwing', () => {
    const values = new Map<string, string>([
      [PENDING_INVENTORY_RECEIPTS_KEY, '{'],
    ])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
    } as unknown as Storage
    expect(salvagePendingInventoryReceipts(storage)).toEqual([])
    expect(values.get(`${PENDING_INVENTORY_RECEIPTS_KEY}.quarantine`)).toBe('{')
  })
})
