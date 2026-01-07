import { describe, expect, it } from 'vitest'

import {
  acknowledgeEvents,
  claimOutbox,
  enqueueEvent,
  retryEvent,
} from './outbox'
import type { SyncEvent } from './sync-event'

const now = '2026-01-07T12:00:00.000Z'
const event = (id: string): SyncEvent => ({
  id,
  schemaVersion: 1,
  branchId: 'branch-01',
  actorId: 'staff-01',
  entityType: 'order',
  entityId: id.replace('evt', 'order'),
  aggregateVersion: 1,
  operation: 'upsert',
  occurredAt: now,
  payload: { status: 'open' },
})

describe('sync outbox', () => {
  it('enqueues idempotently and claims a bounded leased batch', () => {
    const first = enqueueEvent([], event('evt-01'), now)
    const outbox = enqueueEvent(
      enqueueEvent(first, event('evt-01'), now),
      event('evt-02'),
      now,
    )
    const result = claimOutbox(outbox, now, 'lease-a', 1)

    expect(outbox).toHaveLength(2)
    expect(result.claimed).toHaveLength(1)
    expect(result.claimed[0]).toMatchObject({ state: 'inflight', attempts: 1 })
    expect(
      claimOutbox(result.outbox, now, 'lease-b').claimed.map(
        (item) => item.event.id,
      ),
    ).toEqual(['evt-02'])
  })

  it('reclaims an event after its worker lease expires', () => {
    const claimed = claimOutbox(
      enqueueEvent([], event('evt-01'), now),
      now,
      'lease-a',
      1,
      1_000,
    )
    expect(
      claimOutbox(claimed.outbox, '2026-01-07T12:00:00.500Z', 'lease-b')
        .claimed,
    ).toHaveLength(0)
    expect(
      claimOutbox(claimed.outbox, '2026-01-07T12:00:01.000Z', 'lease-b')
        .claimed[0].attempts,
    ).toBe(2)
  })

  it('retries with bounded exponential backoff and acknowledges delivery', () => {
    const claimed = claimOutbox(
      enqueueEvent([], event('evt-01'), now),
      now,
      'lease-a',
    )
    const retried = retryEvent(
      claimed.outbox,
      { eventId: 'evt-01', leaseToken: 'lease-a' },
      now,
      'cloud unavailable',
    )

    expect(retried[0]).toMatchObject({
      state: 'pending',
      lastError: 'cloud unavailable',
      availableAt: '2026-01-07T12:00:02.000Z',
    })
    expect(() =>
      acknowledgeEvents(retried, [
        { eventId: 'evt-01', leaseToken: 'lease-a' },
      ]),
    ).toThrow('Stale')
    expect(
      acknowledgeEvents(claimed.outbox, [
        { eventId: 'evt-01', leaseToken: 'lease-a' },
      ]),
    ).toEqual([])
  })

  it('rejects stale worker acknowledgements after a lease is reclaimed', () => {
    const first = claimOutbox(
      enqueueEvent([], event('evt-01'), now),
      now,
      'lease-a',
      1,
      1_000,
    )
    const second = claimOutbox(
      first.outbox,
      '2026-01-07T12:00:01.000Z',
      'lease-b',
    )
    expect(() =>
      acknowledgeEvents(second.outbox, [
        { eventId: 'evt-01', leaseToken: 'lease-a' },
      ]),
    ).toThrow('Stale')
    expect(
      acknowledgeEvents(second.outbox, [
        { eventId: 'evt-01', leaseToken: 'lease-b' },
      ]),
    ).toEqual([])
  })

  it('rejects event ID collisions with different envelopes', () => {
    const outbox = enqueueEvent([], event('evt-01'), now)
    expect(() =>
      enqueueEvent(
        outbox,
        { ...event('evt-01'), payload: { status: 'paid' } },
        now,
      ),
    ).toThrow('collision')
  })
})
