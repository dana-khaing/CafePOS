export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type SyncOperation = 'upsert' | 'delete'

export type SyncEvent = Readonly<{
  id: string
  schemaVersion: 1
  branchId: string
  actorId: string
  entityType: string
  entityId: string
  aggregateVersion: number
  operation: SyncOperation
  occurredAt: string
  payload: Readonly<Record<string, JsonValue>> | null
}>

export type ReplicaRecord = Readonly<{
  entityType: string
  entityId: string
  aggregateVersion: number
  lastEventId: string
  deleted: boolean
  data: Readonly<Record<string, JsonValue>> | null
}>

export type ApplyEventResult =
  | Readonly<{ status: 'applied'; record: ReplicaRecord }>
  | Readonly<{ status: 'duplicate' | 'stale'; record: ReplicaRecord }>
  | Readonly<{ status: 'conflict'; record: ReplicaRecord; incoming: SyncEvent }>

function nonEmpty(value: string, field: string) {
  if (!value.trim()) throw new TypeError(`${field} is required`)
}

export function validateSyncEvent(event: SyncEvent): SyncEvent {
  nonEmpty(event.id, 'event id')
  nonEmpty(event.branchId, 'branch id')
  nonEmpty(event.actorId, 'actor id')
  nonEmpty(event.entityType, 'entity type')
  nonEmpty(event.entityId, 'entity id')
  if (event.schemaVersion !== 1)
    throw new RangeError('Unsupported sync schema version')
  if (
    !Number.isSafeInteger(event.aggregateVersion) ||
    event.aggregateVersion < 1
  ) {
    throw new RangeError('Aggregate version must be a positive safe integer')
  }
  if (event.operation !== 'upsert' && event.operation !== 'delete') {
    throw new TypeError('Unsupported sync operation')
  }
  if (Number.isNaN(Date.parse(event.occurredAt)))
    throw new TypeError('occurredAt must be ISO-compatible')
  if (event.operation === 'upsert' && event.payload === null) {
    throw new TypeError('Upsert events require a payload')
  }
  if (event.operation === 'delete' && event.payload !== null) {
    throw new TypeError('Delete events cannot contain a payload')
  }
  return event
}

export function applySyncEvent(
  current: ReplicaRecord | null,
  incoming: SyncEvent,
): ApplyEventResult {
  validateSyncEvent(incoming)

  if (current) {
    if (
      current.entityType !== incoming.entityType ||
      current.entityId !== incoming.entityId
    ) {
      throw new TypeError('Sync event identity does not match replica record')
    }
    if (incoming.id === current.lastEventId)
      return { status: 'duplicate', record: current }
    if (incoming.aggregateVersion < current.aggregateVersion)
      return { status: 'stale', record: current }
    if (incoming.aggregateVersion === current.aggregateVersion) {
      return { status: 'conflict', record: current, incoming }
    }
  }

  return {
    status: 'applied',
    record: {
      entityType: incoming.entityType,
      entityId: incoming.entityId,
      aggregateVersion: incoming.aggregateVersion,
      lastEventId: incoming.id,
      deleted: incoming.operation === 'delete',
      data: incoming.payload,
    },
  }
}
