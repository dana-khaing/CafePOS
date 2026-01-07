import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import {
  acknowledgeEvents,
  claimOutbox,
  enqueueEvent,
  retryEvent,
  type OutboxItem,
  type SyncEvent,
  validateSyncEvent,
} from '@cafepos/domain'

export type SyncSummary = Readonly<{
  pending: number
  inflight: number
  total: number
}>

export class FileOutboxStore {
  readonly #path: string
  #operation = Promise.resolve()

  constructor(path: string) {
    this.#path = path
  }

  async #serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#operation.then(operation, operation)
    this.#operation = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  async #read(): Promise<readonly OutboxItem[]> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.#path, 'utf8'))
      if (!Array.isArray(parsed))
        throw new TypeError('Outbox journal must contain an array')
      for (const item of parsed as OutboxItem[]) {
        validateSyncEvent(item.event)
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
      }
      return parsed as OutboxItem[]
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  }

  async #write(outbox: readonly OutboxItem[]) {
    await mkdir(dirname(this.#path), { recursive: true })
    const temporaryPath = `${this.#path}.tmp`
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
      const result = claimOutbox(await this.#read(), now, limit)
      await this.#write(result.outbox)
      return result.claimed
    })
  }

  acknowledge(eventIds: readonly string[]) {
    return this.#serialized(async () => {
      const outbox = acknowledgeEvents(await this.#read(), eventIds)
      await this.#write(outbox)
    })
  }

  retry(eventId: string, error: string, now = new Date().toISOString()) {
    return this.#serialized(async () => {
      const outbox = retryEvent(await this.#read(), eventId, now, error)
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
