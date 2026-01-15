import Fastify from 'fastify'
import cors from '@fastify/cors'

import {
  PRODUCT_NAME,
  type SyncEvent,
  validateCompletedPaymentEvent,
  validateRefundEvent,
  validateSubmittedOrderEvent,
} from '@cafepos/domain'

import type { HubConfig } from './config.js'
import type { FileOutboxStore } from './outbox-store.js'
import type { FileKitchenStore } from './kitchen-store.js'

const startedAt = new Date()

export function createHubApp(
  config: HubConfig,
  outbox?: FileOutboxStore,
  kitchen?: FileKitchenStore,
) {
  const app = Fastify({ logger: true })

  void app.register(cors, {
    origin: [...config.webOrigins],
    methods: ['GET', 'POST'],
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

  app.post('/v1/orders', async (request, reply) => {
    if (!outbox) return reply.code(503).send({ error: 'Outbox unavailable' })
    if (request.headers.authorization !== `Bearer ${config.branchToken}`) {
      return reply
        .code(401)
        .send({ error: 'Branch device authentication required' })
    }
    try {
      const event = request.body as SyncEvent
      const order = validateSubmittedOrderEvent(event)
      if (
        event.branchId !== config.branchId ||
        event.entityType !== 'order' ||
        event.operation !== 'upsert'
      ) {
        return reply.code(400).send({ error: 'Invalid order event scope' })
      }
      if (!kitchen)
        return reply.code(503).send({ error: 'Kitchen unavailable' })
      const created = await kitchen.accept(order)
      try {
        await outbox.enqueue(event, event.occurredAt)
      } catch (error) {
        if (created) await kitchen.remove(order.id)
        throw error
      }
      return reply.code(202).send({ status: 'queued', eventId: event.id })
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : 'Invalid order event',
      })
    }
  })

  app.post('/v1/payments', async (request, reply) => {
    if (!outbox) return reply.code(503).send({ error: 'Outbox unavailable' })
    if (request.headers.authorization !== `Bearer ${config.branchToken}`)
      return reply
        .code(401)
        .send({ error: 'Branch device authentication required' })
    try {
      const event = request.body as SyncEvent
      const payment = validateCompletedPaymentEvent(event)
      if (payment.branchId !== config.branchId)
        return reply.code(400).send({ error: 'Invalid payment branch' })
      await outbox.enqueue(event, event.occurredAt)
      return reply.code(202).send({ status: 'queued', eventId: event.id })
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : 'Invalid payment event',
      })
    }
  })

  app.post('/v1/refunds', async (request, reply) => {
    if (!outbox) return reply.code(503).send({ error: 'Outbox unavailable' })
    if (request.headers.authorization !== `Bearer ${config.branchToken}`)
      return reply
        .code(401)
        .send({ error: 'Branch device authentication required' })
    try {
      const event = request.body as SyncEvent
      const refund = validateRefundEvent(event)
      if (refund.branchId !== config.branchId)
        return reply.code(400).send({ error: 'Invalid refund branch' })
      await outbox.enqueue(event, event.occurredAt)
      return reply.code(202).send({ status: 'queued', eventId: event.id })
    } catch (error) {
      return reply
        .code(400)
        .send({
          error:
            error instanceof Error ? error.message : 'Invalid refund event',
        })
    }
  })

  app.get('/v1/kitchen/tickets', async (request, reply) => {
    if (request.headers.authorization !== `Bearer ${config.branchToken}`)
      return reply
        .code(401)
        .send({ error: 'Branch device authentication required' })
    return { tickets: kitchen ? await kitchen.list() : [] }
  })

  app.post<{
    Params: { ticketId: string }
    Body: { expectedStatus?: string }
  }>('/v1/kitchen/tickets/:ticketId/advance', async (request, reply) => {
    if (request.headers.authorization !== `Bearer ${config.branchToken}`)
      return reply
        .code(401)
        .send({ error: 'Branch device authentication required' })
    if (!kitchen) return reply.code(503).send({ error: 'Kitchen unavailable' })
    try {
      const expectedStatus = request.body?.expectedStatus
      if (!['queued', 'preparing', 'ready'].includes(expectedStatus ?? ''))
        return reply.code(400).send({ error: 'Expected status is required' })
      return {
        ticket: await kitchen.advance(
          request.params.ticketId,
          new Date().toISOString(),
          expectedStatus as 'queued' | 'preparing' | 'ready',
        ),
      }
    } catch (error) {
      return reply.code(409).send({
        error: error instanceof Error ? error.message : 'Kitchen update failed',
      })
    }
  })

  return app
}
