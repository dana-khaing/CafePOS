export const CRITICAL_STORAGE_LOCK = 'cafepos.critical-storage'
export async function withCriticalStorageLock<T>(
  callback: () => T | Promise<T>,
  locks: LockManager | null | undefined = globalThis.navigator?.locks,
) {
  if (!locks) throw new TypeError('Browser-wide storage locking is unavailable')
  return locks.request(CRITICAL_STORAGE_LOCK, callback)
}
