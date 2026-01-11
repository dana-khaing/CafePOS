import {
  calculateDraftOrderTotal,
  type DraftOrder,
  validateDraftOrder,
} from './order.js'
import {
  type JsonValue,
  type SyncEvent,
  validateSyncEvent,
} from './sync-event.js'

export type SubmittedOrder = Readonly<{
  id: string
  branchId: string
  actorId: string
  status: 'submitted'
  submittedAt: string
  version: 1
  draft: DraftOrder
  totals: ReturnType<typeof calculateDraftOrderTotal>
}>

export type SubmitOrderContext = Readonly<{
  branchId: string
  actorId: string
  submittedAt: string
  eventId: string
}>

export type SubmitOrderResult = Readonly<{
  order: SubmittedOrder
  event: SyncEvent
}>

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

function sameMoney(
  left: { currency: string; minor: number },
  right: { currency: string; minor: number },
) {
  return left.currency === right.currency && left.minor === right.minor
}

function required(value: string, field: string) {
  if (!value.trim()) throw new TypeError(`${field} is required`)
}

export function submitDraftOrder(
  draft: DraftOrder,
  context: SubmitOrderContext,
): SubmitOrderResult {
  if (draft.lines.length === 0)
    throw new TypeError('Cannot submit an empty order')
  required(context.branchId, 'Branch id')
  required(context.actorId, 'Actor id')
  required(context.eventId, 'Event id')
  if (Number.isNaN(Date.parse(context.submittedAt)))
    throw new TypeError('Submission time must be ISO-compatible')

  const snapshot = deepFreeze(
    JSON.parse(JSON.stringify(validateDraftOrder(draft))) as DraftOrder,
  )
  const order = deepFreeze<SubmittedOrder>({
    id: draft.id,
    branchId: context.branchId,
    actorId: context.actorId,
    status: 'submitted',
    submittedAt: context.submittedAt,
    version: 1,
    draft: snapshot,
    totals: calculateDraftOrderTotal(snapshot),
  })
  const payload = JSON.parse(JSON.stringify(order)) as Record<string, JsonValue>
  return {
    order,
    event: {
      id: context.eventId,
      schemaVersion: 1,
      branchId: context.branchId,
      actorId: context.actorId,
      entityType: 'order',
      entityId: order.id,
      aggregateVersion: order.version,
      operation: 'upsert',
      occurredAt: context.submittedAt,
      payload,
    },
  }
}

export function validateSubmittedOrder(order: SubmittedOrder): SubmittedOrder {
  required(order.id, 'Order id')
  required(order.branchId, 'Branch id')
  required(order.actorId, 'Actor id')
  if (order.status !== 'submitted' || order.version !== 1)
    throw new TypeError('Submitted order status or version is invalid')
  if (Number.isNaN(Date.parse(order.submittedAt)))
    throw new TypeError('Submission time must be ISO-compatible')
  if (order.draft.id !== order.id)
    throw new TypeError('Draft identity does not match order')
  if (order.draft.lines.length === 0)
    throw new TypeError('Submitted order cannot be empty')
  validateDraftOrder(order.draft)
  const totals = calculateDraftOrderTotal(order.draft)
  if (
    !sameMoney(order.totals.net, totals.net) ||
    !sameMoney(order.totals.tax, totals.tax) ||
    !sameMoney(order.totals.gross, totals.gross)
  )
    throw new TypeError('Submitted order totals do not match its lines')
  return order
}

export function validateSubmittedOrderEvent(event: SyncEvent): SubmittedOrder {
  validateSyncEvent(event)
  if (
    event.entityType !== 'order' ||
    event.operation !== 'upsert' ||
    !event.payload
  )
    throw new TypeError('Event is not a submitted order upsert')
  const order = validateSubmittedOrder(
    event.payload as unknown as SubmittedOrder,
  )
  if (
    event.entityId !== order.id ||
    event.branchId !== order.branchId ||
    event.actorId !== order.actorId ||
    event.occurredAt !== order.submittedAt ||
    event.aggregateVersion !== order.version
  )
    throw new TypeError('Order event envelope does not match payload')
  return order
}
