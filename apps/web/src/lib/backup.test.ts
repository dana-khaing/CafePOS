import { describe, expect, it } from 'vitest'
import { createBackup, restoreBackup, validateBackup } from './backup'
import {
  HISTORY_STORAGE_KEY,
  emptyHistory,
  serializeSaleHistory,
} from './history-storage'

const storage = (values = new Map<string, string>()) =>
  ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }) as unknown as Storage

describe('backup', () => {
  it('creates, validates, and restores a checksummed backup', async () => {
    const source = storage(
      new Map([[HISTORY_STORAGE_KEY, serializeSaleHistory(emptyHistory())]]),
    )
    const backup = await createBackup(source, '2026-01-19T09:00:00Z')
    expect(await validateBackup(backup)).toEqual(backup)
    const target = storage()
    await restoreBackup(target, backup)
    expect(target.getItem(HISTORY_STORAGE_KEY)).toBe(
      serializeSaleHistory(emptyHistory()),
    )
  })
  it('rejects tampering before changing storage', async () => {
    const backup = await createBackup(storage(), '2026-01-19T09:00:00Z')
    const target = storage(new Map([[HISTORY_STORAGE_KEY, 'original']]))
    await expect(
      restoreBackup(target, { ...backup, createdAt: '2026-01-20T09:00:00Z' }),
    ).rejects.toThrow('checksum')
    expect(target.getItem(HISTORY_STORAGE_KEY)).toBe('original')
  })
})
