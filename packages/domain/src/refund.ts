import { addMoney, money, type Money } from './money.js'
import {
  hasPermission,
  membershipRoles,
  type MembershipRole,
} from './access.js'
import { type Receipt, validateReceipt } from './receipt.js'
import {
  type JsonValue,
  type SyncEvent,
  validateSyncEvent,
} from './sync-event.js'

export type Refund = Readonly<{
  id: string
  receiptId: string
  orderId: string
  branchId: string
  actorId: string
  actorRole: MembershipRole
  reason: string
  amount: Money
  createdAt: string
  version: 1
}>

export function refundedTotal(
  refunds: readonly Refund[],
  currency: Money['currency'],
) {
  return refunds.reduce(
    (total, refund) => addMoney(total, refund.amount),
    money(0, currency),
  )
}

export function validateRefund(refund: Refund): Refund {
  if (
    !refund.id?.trim() ||
    !refund.receiptId?.trim() ||
    !refund.orderId?.trim() ||
    !refund.branchId?.trim() ||
    !refund.actorId?.trim() ||
    !refund.reason?.trim()
  )
    throw new TypeError('Refund identity and reason are required')
  if (refund.version !== 1 || Number.isNaN(Date.parse(refund.createdAt)))
    throw new TypeError('Refund version or time is invalid')
  if (
    !membershipRoles.includes(refund.actorRole) ||
    !hasPermission(refund.actorRole, 'refund.create')
  )
    throw new TypeError('Refund actor is not authorized')
  if (
    !['THB', 'MMK'].includes(refund.amount.currency) ||
    !Number.isSafeInteger(refund.amount.minor) ||
    refund.amount.minor < 1
  )
    throw new TypeError('Refund amount must be positive minor units')
  return refund
}

export function createRefund(
  receipt: Receipt,
  previous: readonly Refund[],
  input: {
    id: string
    actorId: string
    actorRole: MembershipRole
    reason: string
    amount: Money
    createdAt: string
  },
): { refund: Refund; event: SyncEvent } {
  validateReceipt(receipt)
  previous.forEach(validateRefund)
  if (previous.some((entry) => entry.id === input.id))
    throw new TypeError('Refund id must be unique')
  if (
    previous.some(
      (entry) =>
        entry.receiptId !== receipt.id ||
        entry.orderId !== receipt.order.id ||
        entry.branchId !== receipt.branchId,
    )
  )
    throw new TypeError('Previous refunds do not belong to this receipt')
  const refund = validateRefund({
    id: input.id,
    receiptId: receipt.id,
    orderId: receipt.order.id,
    branchId: receipt.branchId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    reason: input.reason,
    amount: input.amount,
    createdAt: input.createdAt,
    version: 1,
  })
  if (refund.amount.currency !== receipt.totals.gross.currency)
    throw new TypeError('Refund currency does not match receipt')
  if (
    Date.parse(refund.createdAt) < Date.parse(receipt.issuedAt) ||
    previous.some(
      (entry) => Date.parse(entry.createdAt) > Date.parse(refund.createdAt),
    )
  )
    throw new TypeError('Refund time is before its receipt or previous refund')
  const after = addMoney(
    refundedTotal(previous, refund.amount.currency),
    refund.amount,
  )
  if (after.minor > receipt.totals.gross.minor)
    throw new RangeError('Refund exceeds remaining refundable amount')
  const payload = JSON.parse(JSON.stringify(refund)) as Record<
    string,
    JsonValue
  >
  return {
    refund,
    event: {
      id: `refund:${refund.id}:v1`,
      schemaVersion: 1,
      branchId: refund.branchId,
      actorId: refund.actorId,
      entityType: 'refund',
      entityId: refund.id,
      aggregateVersion: 1,
      operation: 'upsert',
      occurredAt: refund.createdAt,
      payload,
    },
  }
}

export function validateRefundEvent(event: SyncEvent): Refund {
  validateSyncEvent(event)
  if (
    event.entityType !== 'refund' ||
    event.operation !== 'upsert' ||
    !event.payload
  )
    throw new TypeError('Event is not a refund upsert')
  const refund = validateRefund(event.payload as unknown as Refund)
  if (
    event.id !== `refund:${refund.id}:v1` ||
    event.entityId !== refund.id ||
    event.branchId !== refund.branchId ||
    event.actorId !== refund.actorId ||
    event.occurredAt !== refund.createdAt ||
    event.aggregateVersion !== refund.version
  )
    throw new TypeError('Refund event envelope does not match payload')
  return refund
}
