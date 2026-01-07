import { describe, expect, it } from 'vitest'

import { applySyncEvent, type SyncEvent, validateSyncEvent } from './sync-event'

const event = (overrides: Partial<SyncEvent> = {}): SyncEvent => ({
  id: 'evt-01',
  schemaVersion: 1,
  branchId: 'branch-01',
  actorId: 'staff-01',
  entityType: 'order',
  entityId: 'order-01',
  aggregateVersion: 1,
  operation: 'upsert',
  occurredAt: '2026-01-07T09:00:00.000Z',
  payload: { status: 'open' },
  ...overrides,
})

describe('sync events', () => {
  it('applies a versioned mutation to an empty replica', () => {
    expect(applySyncEvent(null, event())).toMatchObject({
      status: 'applied',
      record: { aggregateVersion: 1, deleted: false, data: { status: 'open' } },
    })
  })

  it('is idempotent and rejects stale or conflicting versions', () => {
    const applied = applySyncEvent(null, event())
    if (applied.status !== 'applied') throw new Error('expected applied event')

    expect(applySyncEvent(applied.record, event()).status).toBe('duplicate')
    expect(
      applySyncEvent(applied.record, event({ payload: { status: 'paid' } }))
        .status,
    ).toBe('conflict')
    const newerRecord = {
      ...applied.record,
      aggregateVersion: 2,
      lastEventId: 'evt-02',
    }
    expect(applySyncEvent(newerRecord, event({ id: 'evt-old' })).status).toBe(
      'stale',
    )
    expect(
      applySyncEvent(applied.record, event({ id: 'evt-conflict' })).status,
    ).toBe('conflict')
  })

  it('applies tombstones at a newer version', () => {
    const first = applySyncEvent(null, event())
    if (first.status !== 'applied') throw new Error('expected applied event')
    const deleted = applySyncEvent(
      first.record,
      event({
        id: 'evt-02',
        aggregateVersion: 2,
        operation: 'delete',
        payload: null,
      }),
    )
    expect(deleted).toMatchObject({
      status: 'applied',
      record: { deleted: true, data: null },
    })
  })

  it('validates operation payload and timestamps', () => {
    expect(() => validateSyncEvent(event({ payload: null }))).toThrow(TypeError)
    expect(() =>
      validateSyncEvent(event({ occurredAt: 'not-a-date' })),
    ).toThrow(TypeError)
    expect(() =>
      validateSyncEvent(event({ operation: 'delete', payload: {} })),
    ).toThrow(TypeError)
    expect(() =>
      validateSyncEvent(event({ payload: { amount: Number.NaN } })),
    ).toThrow(TypeError)
    expect(() =>
      validateSyncEvent(event({ payload: { missing: undefined } as never })),
    ).toThrow(TypeError)
  })
})
