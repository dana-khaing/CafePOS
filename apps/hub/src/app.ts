import Fastify from 'fastify'
import cors from '@fastify/cors'

import { PRODUCT_NAME } from '@cafepos/domain'

import type { HubConfig } from './config.js'
import type { FileOutboxStore } from './outbox-store.js'

const startedAt = new Date()

export function createHubApp(config: HubConfig, outbox?: FileOutboxStore) {
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

  app.get('/v1/sync/status', async () => ({
    status: 'ready',
    outbox: outbox
      ? await outbox.summary()
      : { pending: 0, inflight: 0, total: 0 },
  }))

  return app
}
