import { afterEach, describe, expect, it } from 'vitest'

import { createHubApp } from './app.js'

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
})
