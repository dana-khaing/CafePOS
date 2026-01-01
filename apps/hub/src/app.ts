import Fastify from 'fastify'

import { PRODUCT_NAME } from '@cafepos/domain'

export function createHubApp() {
  const app = Fastify({ logger: true })

  app.get('/health', async () => ({
    service: `${PRODUCT_NAME} Branch Hub`,
    status: 'ok',
  }))

  return app
}
