import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'

import {
  acknowledgeEvents,
  claimOutbox,
  enqueueEvent,
  retryEvent,
  type OutboxItem,
  type LeaseReceipt,
  type SyncEvent,
  validateSyncEvent,
} from '@cafepos/domain'

const operationsByPath = new Map<string, Promise<void>>()

export type SyncSummary = Readonly<{
  pending: number
  inflight: number
  total: number
}>

export class FileOutboxStore {
  readonly #path: string

  constructor(path: string) {
    this.#path = resolve(path)
  }

  async #serialized<T>(operation: () => Promise<T>): Promise<T> {
    const previous = operationsByPath.get(this.#path) ?? Promise.resolve()
    const result = previous.then(operation, operation)
    operationsByPath.set(
      this.#path,
      result.then(
        () => undefined,
        () => undefined,
      ),
    )
    return result
  }

  async #read(): Promise<readonly OutboxItem[]> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.#path, 'utf8'))
      if (!Array.isArray(parsed))
        throw new TypeError('Outbox journal must contain an array')
      const eventIds = new Set<string>()
      for (const item of parsed as OutboxItem[]) {
        validateSyncEvent(item.event)
        if (eventIds.has(item.event.id))
          throw new TypeError('Outbox journal contains duplicate event IDs')
        eventIds.add(item.event.id)
        if (item.state !== 'pending' && item.state !== 'inflight') {
          throw new TypeError('Outbox item has an invalid state')
        }
        if (!Number.isSafeInteger(item.attempts) || item.attempts < 0) {
          throw new TypeError('Outbox item has invalid attempts')
        }
        if (Number.isNaN(Date.parse(item.availableAt))) {
          throw new TypeError('Outbox item has invalid availability')
        }
        if (
          item.leaseExpiresAt !== null &&
          Number.isNaN(Date.parse(item.leaseExpiresAt))
        ) {
          throw new TypeError('Outbox item has an invalid lease')
        }
        if (
          (item.state === 'pending' &&
            (item.leaseExpiresAt !== null || item.leaseToken !== null)) ||
          (item.state === 'inflight' &&
            (item.leaseExpiresAt === null || !item.leaseToken?.trim()))
        ) {
          throw new TypeError('Outbox item has inconsistent lease state')
        }
        if (
          item.lastError !== null &&
          (typeof item.lastError !== 'string' || item.lastError.length > 500)
        ) {
          throw new TypeError('Outbox item has an invalid error')
        }
      }
      return parsed as OutboxItem[]
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  }

  async #write(outbox: readonly OutboxItem[]) {
    await mkdir(dirname(this.#path), { recursive: true })
    const temporaryPath = `${this.#path}.${randomUUID()}.tmp`
    await writeFile(temporaryPath, `${JSON.stringify(outbox, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    })
    await rename(temporaryPath, this.#path)
  }

  enqueue(event: SyncEvent, now = new Date().toISOString()) {
    return this.#serialized(async () => {
      const outbox = enqueueEvent(await this.#read(), event, now)
      await this.#write(outbox)
    })
  }

  claim(now = new Date().toISOString(), limit = 50) {
    return this.#serialized(async () => {
      const result = claimOutbox(await this.#read(), now, randomUUID(), limit)
      await this.#write(result.outbox)
      return result.claimed
    })
  }

  acknowledge(receipts: readonly LeaseReceipt[]) {
    return this.#serialized(async () => {
      const outbox = acknowledgeEvents(await this.#read(), receipts)
      await this.#write(outbox)
    })
  }

  retry(receipt: LeaseReceipt, error: string, now = new Date().toISOString()) {
    return this.#serialized(async () => {
      const outbox = retryEvent(await this.#read(), receipt, now, error)
      await this.#write(outbox)
    })
  }

  summary(): Promise<SyncSummary> {
    return this.#serialized(async () => {
      const outbox = await this.#read()
      return {
        pending: outbox.filter((item) => item.state === 'pending').length,
        inflight: outbox.filter((item) => item.state === 'inflight').length,
        total: outbox.length,
      }
    })
  }
}
