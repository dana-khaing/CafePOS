import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { money, submitDraftOrder } from '@cafepos/domain'

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
  branchToken: 'test-branch-device-token',
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
    const { event } = submitDraftOrder(
      {
        id: 'order-1',
        currency: 'THB',
        diningMode: 'counter',
        lines: [
          {
            id: 'line-1',
            itemId: 'latte',
            name: 'Latte',
            quantity: 1,
            unitPrice: money(12000),
            modifiers: [],
            taxRate: {
              id: 'vat7',
              name: 'VAT',
              basisPoints: 700,
              mode: 'inclusive',
            },
          },
        ],
      },
      {
        branchId: config.branchId,
        actorId: 'cashier-1',
        submittedAt: '2026-01-11T12:00:00.000Z',
        eventId: 'event-1',
      },
    )

    const response = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${config.branchToken}` },
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
      headers: { authorization: `Bearer ${config.branchToken}` },
      payload: { ...event, id: 'event-2', branchId: 'other' },
    })
    expect(wrongBranch.statusCode).toBe(400)
    const forged = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${config.branchToken}` },
      payload: { ...event, id: 'event-3', payload: { status: 'submitted' } },
    })
    expect(forged.statusCode).toBe(400)
    const unauthenticated = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: event,
    })
    expect(unauthenticated.statusCode).toBe(401)
  })
})
