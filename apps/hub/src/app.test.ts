import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createHubApp } from './app.js'
import { FileOutboxStore } from './outbox-store.js'

const apps: ReturnType<typeof createHubApp>[] = []
const config = {
  host: '127.0.0.1',
  port: 4310,
  branchId: 'branch-riverside',
  branchName: 'Riverside Cafe',
  publicOrigin: 'https://branch.local.cafepos.test',
  webOrigins: ['http://localhost:3000'],
  outboxPath: './data/outbox.json',
} as const

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('branch hub health endpoint', () => {
  it('reports the service as healthy', async () => {
    const app = createHubApp(config)
    apps.push(app)

    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      service: 'CafePOS Branch Hub',
      status: 'ok',
    })
  })

  it('reports branch identity and permits configured web origins', async () => {
    const app = createHubApp(config)
    apps.push(app)

    const response = await app.inject({
      method: 'GET',
      url: '/v1/status',
      headers: { origin: 'http://localhost:3000' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    )
    expect(response.json()).toMatchObject({
      status: 'ready',
      branch: { id: 'branch-riverside', name: 'Riverside Cafe' },
    })
  })

  it('reports an empty sync queue before local mutations exist', async () => {
    const app = createHubApp(config)
    apps.push(app)

    const response = await app.inject({ method: 'GET', url: '/v1/sync/status' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      status: 'ready',
      outbox: { pending: 0, inflight: 0, total: 0 },
    })
  })

  it('validates and atomically queues submitted order events', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cafepos-order-'))
    const store = new FileOutboxStore(join(directory, 'outbox.json'))
    const app = createHubApp(config, store)
    apps.push(app)
    const event = {
      id: 'event-1',
      schemaVersion: 1,
      branchId: config.branchId,
      actorId: 'cashier-1',
      entityType: 'order',
      entityId: 'order-1',
      aggregateVersion: 1,
      operation: 'upsert',
      occurredAt: '2026-01-11T12:00:00.000Z',
      payload: { status: 'submitted' },
    } as const

    const response = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: event,
    })
    expect(response.statusCode).toBe(202)
    expect(response.json()).toEqual({ status: 'queued', eventId: 'event-1' })
    await expect(store.summary()).resolves.toEqual({
      pending: 1,
      inflight: 0,
      total: 1,
    })

    const wrongBranch = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: { ...event, id: 'event-2', branchId: 'other' },
    })
    expect(wrongBranch.statusCode).toBe(400)
  })
})
