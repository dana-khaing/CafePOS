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
  lastEvent: SyncEvent
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

function validateJson(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError('JSON numbers must be finite')
    return
  }
  if (typeof value !== 'object')
    throw new TypeError('Payload contains a non-JSON value')
  if (seen.has(value)) throw new TypeError('Payload cannot contain cycles')
  seen.add(value)
  if (Array.isArray(value)) {
    for (const item of value) validateJson(item, seen)
  } else {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Payload must contain plain JSON objects')
    }
    for (const item of Object.values(value)) validateJson(item, seen)
  }
  seen.delete(value)
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`
}

export function syncEventsEqual(left: SyncEvent, right: SyncEvent): boolean {
  return (
    left.id === right.id &&
    left.schemaVersion === right.schemaVersion &&
    left.branchId === right.branchId &&
    left.actorId === right.actorId &&
    left.entityType === right.entityType &&
    left.entityId === right.entityId &&
    left.aggregateVersion === right.aggregateVersion &&
    left.operation === right.operation &&
    left.occurredAt === right.occurredAt &&
    canonicalJson(left.payload) === canonicalJson(right.payload)
  )
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
  validateJson(event.payload)
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
    if (incoming.id === current.lastEventId) {
      return syncEventsEqual(current.lastEvent, incoming)
        ? { status: 'duplicate', record: current }
        : { status: 'conflict', record: current, incoming }
    }
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
      lastEvent: incoming,
      deleted: incoming.operation === 'delete',
      data: incoming.payload,
    },
  }
}
