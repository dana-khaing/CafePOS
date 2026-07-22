import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'

import {
  advanceKitchenTicket,
  createKitchenTicket,
  type KitchenTicket,
  type KitchenTicketStatus,
  type SubmittedOrder,
  validateKitchenTicket,
} from '@cafepos/domain'

const operations = new Map<string, Promise<void>>()

export class FileKitchenStore {
  readonly #path: string
  constructor(path: string) {
    this.#path = resolve(path)
  }

  async #serialized<T>(operation: () => Promise<T>): Promise<T> {
    const previous = operations.get(this.#path) ?? Promise.resolve()
    const result = previous.then(operation, operation)
    operations.set(
      this.#path,
      result.then(
        () => undefined,
        () => undefined,
      ),
    )
    return result
  }

  async #read(): Promise<readonly KitchenTicket[]> {
    try {
      const value = JSON.parse(await readFile(this.#path, 'utf8')) as unknown
      if (!Array.isArray(value))
        throw new TypeError('Kitchen journal must be an array')
      const tickets = value.map((ticket) =>
        validateKitchenTicket(ticket as KitchenTicket),
      )
      if (new Set(tickets.map((ticket) => ticket.id)).size !== tickets.length)
        throw new TypeError('Kitchen journal contains duplicate ticket IDs')
      return tickets
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  }

  async #write(tickets: readonly KitchenTicket[]) {
    await mkdir(dirname(this.#path), { recursive: true })
    const temporary = `${this.#path}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(tickets, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    })
    await rename(temporary, this.#path)
  }

  accept(order: SubmittedOrder) {
    return this.#serialized(async () => {
      const tickets = await this.#read()
      if (tickets.some((ticket) => ticket.orderId === order.id)) return false
      await this.#write([...tickets, createKitchenTicket(order)])
      return true
    })
  }

  list() {
    return this.#serialized(async () =>
      (await this.#read()).filter((ticket) => ticket.status !== 'completed'),
    )
  }

  advance(
    ticketId: string,
    updatedAt: string,
    expectedStatus: KitchenTicketStatus,
  ) {
    return this.#serialized(async () => {
      const tickets = await this.#read()
      const ticket = tickets.find((entry) => entry.id === ticketId)
      if (!ticket) throw new Error(`Kitchen ticket not found: ${ticketId}`)
      const updated = advanceKitchenTicket(ticket, updatedAt, expectedStatus)
      await this.#write(
        tickets.map((entry) => (entry.id === ticketId ? updated : entry)),
      )
      return updated
    })
  }

  remove(orderId: string) {
    return this.#serialized(async () => {
      const tickets = await this.#read()
      await this.#write(tickets.filter((ticket) => ticket.orderId !== orderId))
    })
  }
}
