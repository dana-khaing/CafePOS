import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { money, submitDraftOrder } from '@cafepos/domain'
import { FileKitchenStore } from './kitchen-store'

const submitted = submitDraftOrder(
  {
    id: 'order-1',
    currency: 'THB',
    diningMode: 'takeaway',
    lines: [
      {
        id: 'line-1',
        itemId: 'latte',
        name: 'Latte',
        quantity: 1,
        unitPrice: money(12000),
        modifiers: [],
        taxRate: {
          id: 'vat7',
          name: 'VAT',
          basisPoints: 700,
          mode: 'inclusive',
        },
      },
    ],
  },
  {
    branchId: 'branch-1',
    actorId: 'cashier-1',
    submittedAt: '2026-01-12T10:00:00.000Z',
    eventId: 'event-1',
  },
).order

describe('file kitchen store', () => {
  it('accepts idempotently and persists ticket progress', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cafepos-kitchen-'))
    const store = new FileKitchenStore(join(directory, 'kitchen.json'))
    await store.accept(submitted)
    await store.accept(submitted)
    expect(await store.list()).toHaveLength(1)
    await store.advance('kitchen:order-1', '2026-01-12T10:01:00.000Z')
    await store.advance('kitchen:order-1', '2026-01-12T10:02:00.000Z')
    await store.advance('kitchen:order-1', '2026-01-12T10:03:00.000Z')
    expect(await store.list()).toEqual([])
  })
})
