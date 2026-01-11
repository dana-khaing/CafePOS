import { calculateDraftOrderTotal, type DraftOrder } from './order.js'
import { type JsonValue, type SyncEvent } from './sync-event.js'

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

  const order: SubmittedOrder = {
    id: draft.id,
    branchId: context.branchId,
    actorId: context.actorId,
    status: 'submitted',
    submittedAt: context.submittedAt,
    version: 1,
    draft,
    totals: calculateDraftOrderTotal(draft),
  }
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
