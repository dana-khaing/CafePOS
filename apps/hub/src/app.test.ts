import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
  createReceipt,
  createRefund,
  money,
  submitDraftOrder,
} from '@cafepos/domain'

import { createHubApp } from './app.js'
import { FileOutboxStore } from './outbox-store.js'
import { FileKitchenStore } from './kitchen-store.js'
import { FileRefundStore } from './refund-store.js'

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
  kitchenPath: './data/kitchen.json',
  refundPath: './data/refunds.json',
  refundApprovalPin: '2468',
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
    const kitchen = new FileKitchenStore(join(directory, 'kitchen.json'))
    const app = createHubApp(config, store, kitchen)
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

    const queue = await app.inject({
      method: 'GET',
      url: '/v1/kitchen/tickets',
      headers: { authorization: `Bearer ${config.branchToken}` },
    })
    expect(queue.json().tickets).toHaveLength(1)
    const firstAdvance = await app.inject({
      method: 'POST',
      url: '/v1/kitchen/tickets/kitchen%3Aorder-1/advance',
      headers: { authorization: `Bearer ${config.branchToken}` },
      payload: { expectedStatus: 'queued' },
    })
    expect(firstAdvance.statusCode).toBe(200)
    const duplicateAdvance = await app.inject({
      method: 'POST',
      url: '/v1/kitchen/tickets/kitchen%3Aorder-1/advance',
      headers: { authorization: `Bearer ${config.branchToken}` },
      payload: { expectedStatus: 'queued' },
    })
    expect(duplicateAdvance.statusCode).toBe(409)
  })

  it('authenticates and queues validated payment events', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cafepos-payment-'))
    const store = new FileOutboxStore(join(directory, 'outbox.json'))
    const app = createHubApp(config, store)
    apps.push(app)
    const session = addPaymentTender(
      createPaymentSession('payment-1', 'order-1', money(12000)),
      { id: 'cash-1', method: 'cash', amount: money(15000) },
    )
    const { event } = completePayment(session, {
      branchId: config.branchId,
      actorId: 'cashier-1',
      completedAt: '2026-01-13T12:00:00.000Z',
      eventId: 'payment-event-1',
    })
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { authorization: `Bearer ${config.branchToken}` },
      payload: event,
    })
    expect(response.statusCode).toBe(202)
    await expect(store.summary()).resolves.toMatchObject({ pending: 1 })
    const forged = await app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { authorization: `Bearer ${config.branchToken}` },
      payload: { ...event, payload: { status: 'paid' } },
    })
    expect(forged.statusCode).toBe(400)
    const forgedMixedTender = structuredClone(event)
    const forgedPayload = forgedMixedTender.payload as unknown as {
      session: typeof session
      summary: ReturnType<typeof import('@cafepos/domain').paymentSummary>
    }
    forgedPayload.session = {
      ...session,
      tenders: [
        { id: 'cash-1', method: 'cash', amount: money(5000) },
        { id: 'card-1', method: 'card', amount: money(12000) },
      ],
    }
    forgedPayload.summary = {
      paid: money(17000),
      remaining: money(0),
      change: money(5000),
    }
    const forgedResponse = await app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { authorization: `Bearer ${config.branchToken}` },
      payload: forgedMixedTender,
    })
    expect(forgedResponse.statusCode).toBe(400)
  })

  it('authenticates and queues authorized refund events', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cafepos-refund-'))
    const store = new FileOutboxStore(join(directory, 'outbox.json'))
    const refundStore = new FileRefundStore(join(directory, 'refunds.json'))
    const app = createHubApp(config, store, undefined, refundStore)
    apps.push(app)
    const order = {
      id: 'order-refund',
      currency: 'THB' as const,
      diningMode: 'counter' as const,
      lines: [
        {
          id: 'line-1',
          itemId: 'latte',
          name: 'Latte',
          quantity: 1,
          unitPrice: money(12000),
          modifiers: [],
          taxRate: {
            id: 'vat',
            name: 'VAT',
            basisPoints: 700,
            mode: 'inclusive' as const,
          },
        },
      ],
    }
    const session = addPaymentTender(
      createPaymentSession('payment-refund', order.id, money(12000)),
      { id: 'cash-1', method: 'cash', amount: money(12000) },
    )
    const receipt = createReceipt(
      order,
      completePayment(session, {
        branchId: config.branchId,
        actorId: 'cashier-1',
        completedAt: '2026-01-15T09:00:00.000Z',
        eventId: 'payment-refund-event',
      }).payment,
    )
    const { event } = createRefund(receipt, [], {
      id: 'refund-1',
      actorId: 'manager-1',
      actorRole: 'manager',
      reason: 'Customer request',
      amount: money(5000),
      createdAt: '2026-01-15T10:00:00.000Z',
    })
    const response = await app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: {
        authorization: `Bearer ${config.branchToken}`,
        'x-manager-pin': config.refundApprovalPin,
      },
      payload: { receipt, event },
    })
    expect(response.statusCode).toBe(202)
    const forged = await app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: {
        authorization: `Bearer ${config.branchToken}`,
        'x-manager-pin': config.refundApprovalPin,
      },
      payload: { receipt, event: { ...event, branchId: 'other' } },
    })
    expect(forged.statusCode).toBe(400)
    const denied = await app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: {
        authorization: `Bearer ${config.branchToken}`,
        'x-manager-pin': 'wrong',
      },
      payload: { receipt, event },
    })
    expect(denied.statusCode).toBe(403)
  })

  it('verifies manager approval without exposing the configured pin', async () => {
    const app = createHubApp(config)
    apps.push(app)
    const approved = await app.inject({
      method: 'POST',
      url: '/v1/manager/verify',
      headers: {
        authorization: `Bearer ${config.branchToken}`,
        'x-manager-pin': config.refundApprovalPin,
      },
    })
    expect(approved.statusCode).toBe(200)
    expect(approved.json()).toEqual({ approved: true })
    const denied = await app.inject({
      method: 'POST',
      url: '/v1/manager/verify',
      headers: {
        authorization: `Bearer ${config.branchToken}`,
        'x-manager-pin': 'wrong',
      },
    })
    expect(denied.statusCode).toBe(403)
  })
})
