import { describe, expect, it } from 'vitest'
import { adjustStock, consumeReceipt, validateInventory } from './inventory'
import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
} from './payment'
import { createReceipt } from './receipt'
import { money } from './money'

const inventory = {
  items: [
    {
      id: 'beans',
      name: 'Coffee beans',
      unit: 'g' as const,
      quantity: 1000,
      reorderAt: 200,
    },
  ],
  recipes: [{ menuItemId: 'latte', ingredients: { beans: 18 } }],
  adjustments: [],
  consumedReceiptIds: [],
  consumedReceiptFingerprints: {},
  version: 1,
}
const order = {
  id: 'order',
  currency: 'THB' as const,
  diningMode: 'counter' as const,
  lines: [
    {
      id: 'line',
      itemId: 'latte',
      name: 'Latte',
      quantity: 2,
      unitPrice: money(100),
      modifiers: [],
      taxRate: {
        id: 'vat',
        name: 'VAT',
        basisPoints: 700,
        mode: 'inclusive' as const,
      },
    },
  ],
}
const payment = addPaymentTender(
  createPaymentSession('payment', order.id, money(200)),
  {
    id: 'cash',
    method: 'cash',
    amount: money(200),
  },
)
const receipt = createReceipt(
  order,
  completePayment(payment, {
    branchId: 'branch',
    actorId: 'cashier',
    completedAt: '2026-01-17T09:00:00Z',
    eventId: 'event',
  }).payment,
)

describe('inventory', () => {
  it('consumes recipes once per receipt', () => {
    const once = consumeReceipt(inventory, receipt)
    expect(once.items[0]?.quantity).toBe(964)
    expect(consumeReceipt(once, receipt)).toBe(once)
  })
  it('requires managers and records negative variance without blocking sales', () => {
    const adjustment = {
      id: 'a',
      stockItemId: 'beans',
      delta: 10,
      reason: 'Count',
      actorId: 'm',
      occurredAt: '2026-01-17T10:00:00Z',
    }
    expect(() => adjustStock(inventory, adjustment, 'cashier')).toThrow(
      'manager',
    )
    expect(
      adjustStock(inventory, adjustment, 'manager').items[0]?.quantity,
    ).toBe(1010)
    expect(
      adjustStock(
        inventory,
        { ...adjustment, id: 'b', delta: -2000 },
        'manager',
      ).items[0]?.quantity,
    ).toBe(-1000)
  })
  it('rejects duplicate identities', () => {
    expect(() =>
      validateInventory({
        ...inventory,
        items: [...inventory.items, inventory.items[0]!],
      }),
    ).toThrow('unique')
  })
})
