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
  serviceLabel: string
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
    serviceLabel: mode === 'table' ? `Table ${order.draft.tableNumber}` : mode,
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

export function advanceKitchenTicket(
  ticket: KitchenTicket,
  updatedAt: string,
): KitchenTicket {
  if (Number.isNaN(Date.parse(updatedAt)))
    throw new TypeError('Kitchen update time must be ISO-compatible')
  if (Date.parse(updatedAt) < Date.parse(ticket.updatedAt))
    throw new RangeError('Kitchen updates cannot move backwards in time')
  const status = nextStatus[ticket.status]
  if (!status) throw new Error('Completed kitchen tickets cannot advance')
  return { ...ticket, status, updatedAt }
}
