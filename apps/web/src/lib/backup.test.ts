import { describe, expect, it } from 'vitest'
import {
  createBackup,
  restoreBackup,
  validateBackup,
  BACKUP_KEYS,
} from './backup'
import {
  HISTORY_STORAGE_KEY,
  emptyHistory,
  serializeSaleHistory,
} from './history-storage'
import {
  INVENTORY_STORAGE_KEY,
  PENDING_INVENTORY_RECEIPTS_KEY,
} from './inventory-storage'
import { MENU_STORAGE_KEY } from './menu-storage'
import { ORDER_STORAGE_KEY } from './order-storage'
import {
  PAYMENT_STORAGE_KEY,
  PENDING_PAYMENT_EVENT_KEY,
} from './payment-storage'
import { RECEIPT_STORAGE_KEY } from './receipt-storage'
import { SHIFT_STORAGE_KEY } from './shift-storage'
import {
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  serializeSettings,
} from './settings-storage'
import { PENDING_ORDER_SUBMISSION_KEY } from './order-submission'

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
const locks = {
  request: async (_name: string, callback: () => unknown) => callback(),
} as unknown as LockManager

describe('backup', () => {
  it('includes the critical storage keys used by branch operations', () => {
    expect(BACKUP_KEYS).toEqual(
      expect.arrayContaining([
        HISTORY_STORAGE_KEY,
        INVENTORY_STORAGE_KEY,
        PENDING_INVENTORY_RECEIPTS_KEY,
        MENU_STORAGE_KEY,
        SHIFT_STORAGE_KEY,
        ORDER_STORAGE_KEY,
        PENDING_ORDER_SUBMISSION_KEY,
        PAYMENT_STORAGE_KEY,
        PENDING_PAYMENT_EVENT_KEY,
        RECEIPT_STORAGE_KEY,
        SETTINGS_STORAGE_KEY,
      ]),
    )
  })

  it('creates, validates, and restores a checksummed backup', async () => {
    const source = storage(
      new Map([[HISTORY_STORAGE_KEY, serializeSaleHistory(emptyHistory())]]),
    )
    const backup = await createBackup(source, '2026-01-19T09:00:00Z', locks)
    expect(await validateBackup(backup)).toEqual(backup)
    const target = storage()
    await restoreBackup(target, backup, locks)
    expect(target.getItem(HISTORY_STORAGE_KEY)).toBe(
      serializeSaleHistory(emptyHistory()),
    )
  })
  it('rejects tampering before changing storage', async () => {
    const backup = await createBackup(storage(), '2026-01-19T09:00:00Z', locks)
    const target = storage(new Map([[HISTORY_STORAGE_KEY, 'original']]))
    await expect(
      restoreBackup(
        target,
        { ...backup, createdAt: '2026-01-20T09:00:00Z' },
        locks,
      ),
    ).rejects.toThrow('checksum')
    expect(target.getItem(HISTORY_STORAGE_KEY)).toBe('original')
  })
  it('waits for the shared writer lock before snapshotting', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let reads = 0
    const deferredLocks = {
      request: async (_name: string, callback: () => unknown) => {
        await gate
        return callback()
      },
    } as unknown as LockManager
    const tracked = {
      getItem: () => {
        reads += 1
        return null
      },
    } as unknown as Storage
    const pending = createBackup(tracked, '2026-01-19T09:00:00Z', deferredLocks)
    await Promise.resolve()
    expect(reads).toBe(0)
    release()
    await pending
    expect(reads).toBeGreaterThan(0)
  })
  it('includes and restores validated branch settings', async () => {
    const encoded = serializeSettings({
      ...defaultSettings(),
      cafeName: 'คาเฟ่',
    })
    const backup = await createBackup(
      storage(new Map([[SETTINGS_STORAGE_KEY, encoded]])),
      '2026-01-20T09:00:00Z',
      locks,
    )
    expect(backup.schema).toBe(2)
    const target = storage()
    await restoreBackup(target, backup, locks)
    expect(target.getItem(SETTINGS_STORAGE_KEY)).toBe(encoded)
  })
})
