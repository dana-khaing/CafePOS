import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import {
  createRefund,
  validateReceipt,
  validateRefund,
  validateRefundEvent,
  type Receipt,
  type Refund,
  type SyncEvent,
} from '@cafepos/domain'

type RefundJournal = { receipts: Receipt[]; refunds: Refund[] }
const operations = new Map<string, Promise<void>>()

export class FileRefundStore {
  readonly #path: string
  constructor(path: string) {
    this.#path = resolve(path)
  }
  async #serialized<T>(operation: () => Promise<T>) {
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
  async #read(): Promise<RefundJournal> {
    try {
      const value = JSON.parse(
        await readFile(this.#path, 'utf8'),
      ) as RefundJournal
      if (!Array.isArray(value.receipts) || !Array.isArray(value.refunds))
        throw new TypeError('Refund journal is invalid')
      value.receipts.forEach(validateReceipt)
      value.refunds.forEach(validateRefund)
      for (const receipt of value.receipts) {
        const entries = value.refunds
          .filter((entry) => entry.receiptId === receipt.id)
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        const accepted: Refund[] = []
        for (const refund of entries) {
          createRefund(receipt, accepted, {
            id: refund.id,
            actorId: refund.actorId,
            actorRole: refund.actorRole,
            reason: refund.reason,
            amount: refund.amount,
            createdAt: refund.createdAt,
          })
          accepted.push(refund)
        }
      }
      return value
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return { receipts: [], refunds: [] }
      throw error
    }
  }
  async #write(value: RefundJournal) {
    await mkdir(dirname(this.#path), { recursive: true })
    const temporary = `${this.#path}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      mode: 0o600,
    })
    await rename(temporary, this.#path)
  }
  accept(receipt: Receipt, event: SyncEvent) {
    return this.#serialized(async () => {
      validateReceipt(receipt)
      const refund = validateRefundEvent(event)
      const journal = await this.#read()
      const existingReceipt = journal.receipts.find(
        (entry) => entry.id === receipt.id,
      )
      if (
        existingReceipt &&
        JSON.stringify(existingReceipt) !== JSON.stringify(receipt)
      )
        throw new TypeError('Receipt identity collision')
      const previous = journal.refunds.filter(
        (entry) => entry.receiptId === receipt.id,
      )
      const rebuilt = createRefund(receipt, previous, {
        id: refund.id,
        actorId: refund.actorId,
        actorRole: refund.actorRole,
        reason: refund.reason,
        amount: refund.amount,
        createdAt: refund.createdAt,
      })
      if (JSON.stringify(rebuilt.event) !== JSON.stringify(event))
        throw new TypeError('Refund event does not match validated command')
      if (!journal.refunds.some((entry) => entry.id === refund.id)) {
        if (!existingReceipt) journal.receipts.push(receipt)
        journal.refunds.push(refund)
        await this.#write(journal)
      }
      return refund
    })
  }
}
