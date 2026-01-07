import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { SyncEvent } from '@cafepos/domain'

import { FileOutboxStore } from './outbox-store'

const directories: string[] = []
afterEach(async () =>
  Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true })),
  ),
)

const event: SyncEvent = {
  id: 'evt-01',
  schemaVersion: 1,
  branchId: 'branch-01',
  actorId: 'staff-01',
  entityType: 'order',
  entityId: 'order-01',
  aggregateVersion: 1,
  operation: 'upsert',
  occurredAt: '2026-01-07T17:00:00.000Z',
  payload: { status: 'open' },
}

describe('file outbox store', () => {
  it('persists events atomically and survives a new store instance', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cafepos-outbox-'))
    directories.push(directory)
    const path = join(directory, 'outbox.json')
    await new FileOutboxStore(path).enqueue(event, event.occurredAt)

    expect(await new FileOutboxStore(path).summary()).toEqual({
      pending: 1,
      inflight: 0,
      total: 1,
    })
    expect((await readFile(path, 'utf8')).endsWith('\n')).toBe(true)
  })

  it('serializes concurrent writes without losing events', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cafepos-outbox-'))
    directories.push(directory)
    const path = join(directory, 'outbox.json')

    await Promise.all([
      new FileOutboxStore(path).enqueue(event, event.occurredAt),
      new FileOutboxStore(path).enqueue(
        { ...event, id: 'evt-02', entityId: 'order-02' },
        event.occurredAt,
      ),
    ])
    expect(await new FileOutboxStore(path).summary()).toEqual({
      pending: 2,
      inflight: 0,
      total: 2,
    })
  })

  it('rejects inconsistent leases and duplicate IDs in a corrupted journal', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cafepos-outbox-'))
    directories.push(directory)
    const path = join(directory, 'outbox.json')
    const store = new FileOutboxStore(path)
    await store.enqueue(event, event.occurredAt)
    const items = JSON.parse(await readFile(path, 'utf8')) as Record<
      string,
      unknown
    >[]

    items[0] = { ...items[0], state: 'inflight', leaseExpiresAt: null }
    await writeFile(path, JSON.stringify(items))
    await expect(store.summary()).rejects.toThrow('lease state')

    items[0] = {
      ...items[0],
      state: 'pending',
      leaseToken: null,
      leaseExpiresAt: null,
    }
    await writeFile(path, JSON.stringify([items[0], items[0]]))
    await expect(store.summary()).rejects.toThrow('duplicate')
  })
})
