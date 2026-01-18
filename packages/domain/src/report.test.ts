import { describe, expect, it } from 'vitest'
import {
  addPaymentTender,
  completePayment,
  createPaymentSession,
} from './payment'
import { createReceipt } from './receipt'
import { createRefund } from './refund'
import { money } from './money'
import { buildSalesReport } from './report'

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
      unitPrice: money(6000),
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
let payment = createPaymentSession('payment', order.id, money(12000))
payment = addPaymentTender(payment, {
  id: 'cash',
  method: 'cash',
  amount: money(15000),
})
const receipt = createReceipt(
  order,
  completePayment(payment, {
    branchId: 'branch',
    actorId: 'cashier',
    completedAt: '2026-01-18T09:00:00Z',
    eventId: 'event',
  }).payment,
)
const refund = createRefund(receipt, [], {
  id: 'refund',
  actorId: 'manager',
  actorRole: 'manager',
  reason: 'Return',
  amount: money(2000),
  createdAt: '2026-01-18T10:00:00Z',
}).refund

describe('sales reports', () => {
  it('calculates gross, refunds, net, tender change, and products', () => {
    const report = buildSalesReport([receipt], [refund], {
      from: '2026-01-18T00:00:00Z',
      to: '2026-01-19T00:00:00Z',
    })
    expect(report).toMatchObject({
      orderCount: 1,
      grossMinor: 12000,
      refundMinor: 2000,
      netMinor: 10000,
      averageOrderMinor: 12000,
    })
    expect(report.tenders.cash).toBe(12000)
    expect(report.products[0]).toMatchObject({
      itemId: 'latte',
      quantity: 2,
      grossMinor: 12000,
    })
  })
  it('uses a half-open date range and rejects invalid ranges', () => {
    expect(
      buildSalesReport([receipt], [], {
        from: '2026-01-19T00:00:00Z',
        to: '2026-01-20T00:00:00Z',
      }).orderCount,
    ).toBe(0)
    expect(() =>
      buildSalesReport([], [], { from: 'bad', to: 'also-bad' }),
    ).toThrow('range')
  })
  it('rejects refunds before or beyond their receipt', () => {
    expect(() =>
      buildSalesReport([receipt], [{ ...refund, amount: money(13000) }], {
        from: '2026-01-18T00:00:00Z',
        to: '2026-01-19T00:00:00Z',
      }),
    ).toThrow('exceed')
    expect(() =>
      buildSalesReport(
        [receipt],
        [{ ...refund, createdAt: '2026-01-18T08:00:00Z' }],
        {
          from: '2026-01-18T00:00:00Z',
          to: '2026-01-19T00:00:00Z',
        },
      ),
    ).toThrow('chronology')
  })
})
