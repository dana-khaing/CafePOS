import { describe, expect, it } from 'vitest'
import {
  initialInventory,
  parseInventory,
  serializeInventory,
  updateStoredInventory,
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
})
