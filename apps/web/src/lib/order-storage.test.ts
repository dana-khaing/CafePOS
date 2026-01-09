import { describe, expect, it } from 'vitest'

import { type DraftOrder } from '@cafepos/domain'

import { parseStoredOrder, serializeOrder } from './order-storage'

const fallback: DraftOrder = { id: 'new', currency: 'THB', lines: [] }

describe('draft order storage', () => {
  it('round trips a validated draft', () => {
    expect(parseStoredOrder(serializeOrder(fallback), fallback)).toEqual(
      fallback,
    )
  })

  it('falls back for malformed and forged drafts', () => {
    expect(parseStoredOrder('{', fallback)).toBe(fallback)
    expect(
      parseStoredOrder(
        JSON.stringify({
          id: 'forged',
          currency: 'THB',
          lines: [
            { id: 'line', itemId: 'latte', name: 'Latte', quantity: 1.5 },
          ],
        }),
        fallback,
      ),
    ).toBe(fallback)
  })
})
