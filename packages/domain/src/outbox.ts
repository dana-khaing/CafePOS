import {
  syncEventsEqual,
  type SyncEvent,
  validateSyncEvent,
} from './sync-event.js'

export type OutboxState = 'pending' | 'inflight'

export type OutboxItem = Readonly<{
  event: SyncEvent
  state: OutboxState
  attempts: number
  availableAt: string
  leaseExpiresAt: string | null
  leaseToken: string | null
  lastError: string | null
}>

export type LeaseReceipt = Readonly<{ eventId: string; leaseToken: string }>

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
  const existing = outbox.find((item) => item.event.id === event.id)
  if (existing) {
    if (syncEventsEqual(existing.event, event)) return outbox
    throw new Error(`Sync event ID collision: ${event.id}`)
  }
  return [
    ...outbox,
    {
      event,
      state: 'pending' as const,
      attempts: 0,
      availableAt: now,
      leaseExpiresAt: null,
      leaseToken: null,
      lastError: null,
    },
  ]
}

export function claimOutbox(
  outbox: readonly OutboxItem[],
  now: string,
  leaseToken: string,
  limit = 50,
  leaseMilliseconds = 30_000,
): ClaimResult {
  const nowMs = timestamp(now, 'now')
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new RangeError('Claim limit must be positive')
  if (!Number.isSafeInteger(leaseMilliseconds) || leaseMilliseconds < 1) {
    throw new RangeError('Lease duration must be positive')
  }
  if (!leaseToken.trim()) throw new TypeError('Lease token is required')

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
        timestamp(left.availableAt, 'availableAt') -
          timestamp(right.availableAt, 'availableAt') ||
        left.event.id.localeCompare(right.event.id),
    )
    .slice(0, limit)

  const ids = new Set(eligible.map((item) => item.event.id))
  if (eligible.some((item) => item.attempts === Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Outbox attempts exceed safe integer range')
  }
  const leaseExpiresAt = new Date(nowMs + leaseMilliseconds).toISOString()
  const updated = outbox.map((item) =>
    ids.has(item.event.id)
      ? {
          ...item,
          state: 'inflight' as const,
          attempts: item.attempts + 1,
          leaseExpiresAt,
          leaseToken,
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
  receipts: readonly LeaseReceipt[],
): readonly OutboxItem[] {
  const receiptById = new Map(
    receipts.map((receipt) => [receipt.eventId, receipt.leaseToken]),
  )
  for (const [eventId, leaseToken] of receiptById) {
    const item = outbox.find((candidate) => candidate.event.id === eventId)
    if (!item || item.state !== 'inflight' || item.leaseToken !== leaseToken) {
      throw new Error(`Stale or unknown outbox acknowledgement: ${eventId}`)
    }
  }
  return outbox.filter((item) => !receiptById.has(item.event.id))
}

export function retryEvent(
  outbox: readonly OutboxItem[],
  receipt: LeaseReceipt,
  now: string,
  error: string,
): readonly OutboxItem[] {
  const nowMs = timestamp(now, 'now')
  const active = outbox.find((item) => item.event.id === receipt.eventId)
  if (
    !active ||
    active.state !== 'inflight' ||
    active.leaseToken !== receipt.leaseToken
  ) {
    throw new Error('Only the active lease can retry an event')
  }
  return outbox.map((item) => {
    if (item.event.id !== receipt.eventId) return item
    const delaySeconds = Math.min(300, 2 ** Math.min(item.attempts, 8))
    return {
      ...item,
      state: 'pending' as const,
      availableAt: new Date(nowMs + delaySeconds * 1_000).toISOString(),
      leaseExpiresAt: null,
      leaseToken: null,
      lastError: error.slice(0, 500),
    }
  })
}
