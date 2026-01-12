import {
  type SubmittedOrder,
  validateSubmittedOrder,
} from './submitted-order.js'

export type KitchenTicketStatus = 'queued' | 'preparing' | 'ready' | 'completed'

export type KitchenTicket = Readonly<{
  id: string
  orderId: string
  branchId: string
  status: KitchenTicketStatus
  diningMode: SubmittedOrder['draft']['diningMode']
  tableNumber?: string
  version: number
  createdAt: string
  updatedAt: string
  lines: readonly Readonly<{
    id: string
    name: string
    quantity: number
    modifiers: readonly string[]
    note?: string
  }>[]
}>

const nextStatus: Readonly<
  Record<KitchenTicketStatus, KitchenTicketStatus | null>
> = {
  queued: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
}

export function createKitchenTicket(order: SubmittedOrder): KitchenTicket {
  validateSubmittedOrder(order)
  const mode = order.draft.diningMode
  return {
    id: `kitchen:${order.id}`,
    orderId: order.id,
    branchId: order.branchId,
    status: 'queued',
    diningMode: mode,
    ...(order.draft.tableNumber
      ? { tableNumber: order.draft.tableNumber }
      : {}),
    version: 1,
    createdAt: order.submittedAt,
    updatedAt: order.submittedAt,
    lines: order.draft.lines.map((line) => ({
      id: line.id,
      name: line.name,
      quantity: line.quantity,
      modifiers: line.modifiers.map((modifier) => modifier.name),
      ...(line.note ? { note: line.note } : {}),
    })),
  }
}

export function validateKitchenTicket(ticket: KitchenTicket): KitchenTicket {
  for (const [value, field] of [
    [ticket.id, 'Ticket id'],
    [ticket.orderId, 'Order id'],
    [ticket.branchId, 'Branch id'],
  ] as const)
    if (typeof value !== 'string' || !value.trim())
      throw new TypeError(`${field} is required`)
  if (!['queued', 'preparing', 'ready', 'completed'].includes(ticket.status))
    throw new TypeError('Kitchen status is invalid')
  if (!['counter', 'takeaway', 'table'].includes(ticket.diningMode))
    throw new TypeError('Kitchen dining mode is invalid')
  if (
    ticket.diningMode === 'table'
      ? !ticket.tableNumber?.trim()
      : ticket.tableNumber !== undefined
  )
    throw new TypeError('Kitchen table number is invalid')
  if (!Number.isSafeInteger(ticket.version) || ticket.version < 1)
    throw new TypeError('Kitchen version is invalid')
  const created = Date.parse(ticket.createdAt)
  const updated = Date.parse(ticket.updatedAt)
  if (Number.isNaN(created) || Number.isNaN(updated) || created > updated)
    throw new TypeError('Kitchen timestamps are invalid')
  if (!Array.isArray(ticket.lines) || ticket.lines.length === 0)
    throw new TypeError('Kitchen ticket requires lines')
  const ids = new Set<string>()
  for (const line of ticket.lines) {
    if (!line.id?.trim() || !line.name?.trim())
      throw new TypeError('Kitchen line identity and name are required')
    if (ids.has(line.id)) throw new TypeError('Kitchen line ids must be unique')
    ids.add(line.id)
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1)
      throw new TypeError('Kitchen quantity is invalid')
    if (
      !Array.isArray(line.modifiers) ||
      line.modifiers.some(
        (value: unknown) => typeof value !== 'string' || !value.trim(),
      )
    )
      throw new TypeError('Kitchen modifiers are invalid')
    if (
      line.note !== undefined &&
      (typeof line.note !== 'string' || !line.note.trim())
    )
      throw new TypeError('Kitchen note is invalid')
  }
  return ticket
}

export function advanceKitchenTicket(
  ticket: KitchenTicket,
  updatedAt: string,
  expectedStatus: KitchenTicketStatus = ticket.status,
): KitchenTicket {
  validateKitchenTicket(ticket)
  if (ticket.status !== expectedStatus)
    throw new Error(
      `Kitchen status conflict: expected ${expectedStatus}, found ${ticket.status}`,
    )
  if (Number.isNaN(Date.parse(updatedAt)))
    throw new TypeError('Kitchen update time must be ISO-compatible')
  if (Date.parse(updatedAt) < Date.parse(ticket.updatedAt))
    throw new RangeError('Kitchen updates cannot move backwards in time')
  const status = nextStatus[ticket.status]
  if (!status) throw new Error('Completed kitchen tickets cannot advance')
  return validateKitchenTicket({
    ...ticket,
    status,
    updatedAt,
    version: ticket.version + 1,
  })
}
