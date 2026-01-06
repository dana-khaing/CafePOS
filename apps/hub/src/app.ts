import Fastify from 'fastify'
import cors from '@fastify/cors'

import { PRODUCT_NAME } from '@cafepos/domain'

import type { HubConfig } from './config.js'

const startedAt = new Date()

export function createHubApp(config: HubConfig) {
  const app = Fastify({ logger: true })

  void app.register(cors, {
    origin: [...config.webOrigins],
    methods: ['GET'],
    strictPreflight: true,
  })

  app.get('/health', async () => ({
    service: `${PRODUCT_NAME} Branch Hub`,
    status: 'ok',
  }))

  app.get('/v1/status', async () => ({
    service: `${PRODUCT_NAME} Branch Hub`,
    status: 'ready',
    branch: { id: config.branchId, name: config.branchName },
    publicOrigin: config.publicOrigin,
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  }))

  return app
}
