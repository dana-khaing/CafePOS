import { type SyncEvent, validateSyncEvent } from './sync-event.js'

export type OutboxState = 'pending' | 'inflight'

export type OutboxItem = Readonly<{
  event: SyncEvent
  state: OutboxState
  attempts: number
  availableAt: string
  leaseExpiresAt: string | null
  lastError: string | null
}>

export type ClaimResult = Readonly<{
  outbox: readonly OutboxItem[]
  claimed: readonly OutboxItem[]
}>

function timestamp(value: string, field: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed))
    throw new TypeError(`${field} must be ISO-compatible`)
  return parsed
}

export function enqueueEvent(
  outbox: readonly OutboxItem[],
  event: SyncEvent,
  now: string,
): readonly OutboxItem[] {
  validateSyncEvent(event)
  timestamp(now, 'now')
  if (outbox.some((item) => item.event.id === event.id)) return outbox
  return [
    ...outbox,
    {
      event,
      state: 'pending' as const,
      attempts: 0,
      availableAt: now,
      leaseExpiresAt: null,
      lastError: null,
    },
  ]
}

export function claimOutbox(
  outbox: readonly OutboxItem[],
  now: string,
  limit = 50,
  leaseMilliseconds = 30_000,
): ClaimResult {
  const nowMs = timestamp(now, 'now')
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new RangeError('Claim limit must be positive')
  if (!Number.isSafeInteger(leaseMilliseconds) || leaseMilliseconds < 1) {
    throw new RangeError('Lease duration must be positive')
  }

  const eligible = outbox
    .filter((item) => {
      if (item.state === 'pending')
        return timestamp(item.availableAt, 'availableAt') <= nowMs
      return (
        item.leaseExpiresAt !== null &&
        timestamp(item.leaseExpiresAt, 'leaseExpiresAt') <= nowMs
      )
    })
    .sort(
      (left, right) =>
        left.availableAt.localeCompare(right.availableAt) ||
        left.event.id.localeCompare(right.event.id),
    )
    .slice(0, limit)

  const ids = new Set(eligible.map((item) => item.event.id))
  const leaseExpiresAt = new Date(nowMs + leaseMilliseconds).toISOString()
  const updated = outbox.map((item) =>
    ids.has(item.event.id)
      ? {
          ...item,
          state: 'inflight' as const,
          attempts: item.attempts + 1,
          leaseExpiresAt,
        }
      : item,
  )
  return {
    outbox: updated,
    claimed: updated.filter((item) => ids.has(item.event.id)),
  }
}

export function acknowledgeEvents(
  outbox: readonly OutboxItem[],
  eventIds: readonly string[],
): readonly OutboxItem[] {
  const ids = new Set(eventIds)
  return outbox.filter((item) => !ids.has(item.event.id))
}

export function retryEvent(
  outbox: readonly OutboxItem[],
  eventId: string,
  now: string,
  error: string,
): readonly OutboxItem[] {
  const nowMs = timestamp(now, 'now')
  return outbox.map((item) => {
    if (item.event.id !== eventId) return item
    if (item.state !== 'inflight')
      throw new Error('Only inflight events can be retried')
    const delaySeconds = Math.min(300, 2 ** Math.min(item.attempts, 8))
    return {
      ...item,
      state: 'pending' as const,
      availableAt: new Date(nowMs + delaySeconds * 1_000).toISOString(),
      leaseExpiresAt: null,
      lastError: error.slice(0, 500),
    }
  })
}
