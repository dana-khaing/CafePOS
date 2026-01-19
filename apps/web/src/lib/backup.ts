import { validateInventory, validateMenu } from '@cafepos/domain'
import { HISTORY_STORAGE_KEY, validateSaleHistory } from './history-storage'
import { INVENTORY_STORAGE_KEY } from './inventory-storage'
import { MENU_STORAGE_KEY } from './menu-storage'
import { SHIFT_STORAGE_KEY, validateShiftLedger } from './shift-storage'

export const BACKUP_KEYS = [
  HISTORY_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MENU_STORAGE_KEY,
  SHIFT_STORAGE_KEY,
] as const
export type CafeBackup = Readonly<{
  product: 'CafePOS'
  schema: 1
  createdAt: string
  data: Readonly<Record<string, string>>
  sha256: string
}>
const canonical = (value: Omit<CafeBackup, 'sha256'>) => JSON.stringify(value)
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
export async function createBackup(
  storage: Storage,
  createdAt = new Date().toISOString(),
): Promise<CafeBackup> {
  if (Number.isNaN(Date.parse(createdAt)))
    throw new TypeError('Backup time is invalid')
  const data: Record<string, string> = {}
  for (const key of BACKUP_KEYS) {
    const value = storage.getItem(key)
    if (value !== null) data[key] = value
  }
  const unsigned = {
    product: 'CafePOS' as const,
    schema: 1 as const,
    createdAt,
    data,
  }
  return { ...unsigned, sha256: await sha256(canonical(unsigned)) }
}
export async function validateBackup(value: CafeBackup) {
  if (
    value.product !== 'CafePOS' ||
    value.schema !== 1 ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    !value.data ||
    typeof value.data !== 'object'
  )
    throw new TypeError('Backup envelope is invalid')
  if (
    Object.keys(value.data).some(
      (key) => !(BACKUP_KEYS as readonly string[]).includes(key),
    )
  )
    throw new TypeError('Backup contains unsupported keys')
  const { sha256: checksum, ...unsigned } = value
  if (checksum !== (await sha256(canonical(unsigned))))
    throw new TypeError('Backup checksum does not match')
  for (const [key, raw] of Object.entries(value.data)) {
    if (typeof raw !== 'string')
      throw new TypeError('Backup values must be strings')
    const parsed = JSON.parse(raw) as never
    if (key === HISTORY_STORAGE_KEY) validateSaleHistory(parsed)
    else if (key === INVENTORY_STORAGE_KEY) validateInventory(parsed)
    else if (key === MENU_STORAGE_KEY) validateMenu(parsed)
    else if (key === SHIFT_STORAGE_KEY) validateShiftLedger(parsed)
  }
  return value
}
export async function restoreBackup(storage: Storage, value: CafeBackup) {
  await validateBackup(value)
  const previous = new Map(
    BACKUP_KEYS.map((key) => [key, storage.getItem(key)]),
  )
  try {
    for (const key of BACKUP_KEYS) {
      const next = value.data[key]
      if (next === undefined) storage.removeItem(key)
      else storage.setItem(key, next)
    }
  } catch (error) {
    for (const [key, old] of previous) {
      if (old === null) storage.removeItem(key)
      else storage.setItem(key, old)
    }
    throw error
  }
}
