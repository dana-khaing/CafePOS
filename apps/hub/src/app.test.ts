import { afterEach, describe, expect, it } from 'vitest'

import { createHubApp } from './app.js'

const apps: ReturnType<typeof createHubApp>[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('branch hub health endpoint', () => {
  it('reports the service as healthy', async () => {
    const app = createHubApp()
    apps.push(app)

    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      service: 'CafePOS Branch Hub',
      status: 'ok',
    })
  })
})
