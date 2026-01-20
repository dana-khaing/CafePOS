import { withCriticalStorageLock } from './storage-lock'

export const SETTINGS_STORAGE_KEY = 'cafepos.settings.v1'
export type CafeSettings = Readonly<{
  cafeName: string
  branchName: string
  timezone: string
  receiptFooter: string
  printerWidth: 58 | 80
  version: 1
}>
export const defaultSettings = (): CafeSettings => ({
  cafeName: 'Riverside Cafe',
  branchName: 'Bangkok',
  timezone: 'Asia/Bangkok',
  receiptFooter: 'Thank you · ขอบคุณ',
  printerWidth: 80,
  version: 1,
})
export function validateSettings(value: CafeSettings) {
  if (
    !value.cafeName?.trim() ||
    value.cafeName.length > 80 ||
    !value.branchName?.trim() ||
    value.branchName.length > 80 ||
    !value.receiptFooter?.trim() ||
    value.receiptFooter.length > 500 ||
    value.version !== 1 ||
    ![58, 80].includes(value.printerWidth)
  )
    throw new TypeError('Cafe settings are invalid')
  try {
    new Intl.DateTimeFormat('en', { timeZone: value.timezone }).format()
  } catch {
    throw new TypeError('Cafe timezone is invalid')
  }
  return value
}
export const parseSettings = (raw: string | null) =>
  raw ? validateSettings(JSON.parse(raw) as CafeSettings) : defaultSettings()
export const serializeSettings = (value: CafeSettings) =>
  JSON.stringify(validateSettings(value))
export async function saveSettings(
  storage: Storage,
  value: CafeSettings,
  locks: LockManager | null | undefined = globalThis.navigator?.locks,
) {
  validateSettings(value)
  await withCriticalStorageLock(
    () => storage.setItem(SETTINGS_STORAGE_KEY, serializeSettings(value)),
    locks,
  )
}
