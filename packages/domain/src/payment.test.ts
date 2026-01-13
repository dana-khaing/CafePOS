import { describe, expect, it } from 'vitest'
import { money } from './money'
import {
  addPaymentTender,
  createPaymentSession,
  paymentSummary,
  removePaymentTender,
} from './payment'

describe('payments', () => {
  it('supports split tender and exact non-cash settlement', () => {
    let session = createPaymentSession('pay-1', 'order-1', money(15000))
    session = addPaymentTender(session, {
      id: 'cash-1',
      method: 'cash',
      amount: money(5000),
    })
    session = addPaymentTender(session, {
      id: 'qr-1',
      method: 'qr',
      amount: money(10000),
      reference: 'QR-123',
    })
    expect(session.status).toBe('paid')
    expect(paymentSummary(session)).toEqual({
      paid: money(15000),
      remaining: money(0),
      change: money(0),
    })
  })

  it('calculates cash change and prevents non-cash overpayment', () => {
    const session = createPaymentSession('pay-1', 'order-1', money(12000))
    const paid = addPaymentTender(session, {
      id: 'cash-1',
      method: 'cash',
      amount: money(20000),
    })
    expect(paymentSummary(paid).change).toEqual(money(8000))
    expect(() =>
      addPaymentTender(session, {
        id: 'card-1',
        method: 'card',
        amount: money(12001),
      }),
    ).toThrow('exceed')
  })

  it('rejects forged amounts and can remove an open split tender', () => {
    const session = createPaymentSession('pay-1', 'order-1', money(12000))
    expect(() =>
      addPaymentTender(session, {
        id: 'bad',
        method: 'cash',
        amount: { currency: 'THB', minor: 1.5 },
      }),
    ).toThrow('amount')
    const split = addPaymentTender(session, {
      id: 'cash-1',
      method: 'cash',
      amount: money(5000),
    })
    expect(paymentSummary(removePaymentTender(split, 'cash-1')).paid).toEqual(
      money(0),
    )
  })
})
