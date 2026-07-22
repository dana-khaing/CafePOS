'use client'

import { CreditCard, QrCode, WalletCards } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  addPaymentTender,
  completePayment,
  money,
  paymentSummary,
  validateCompletedPaymentEvent,
  type CompletedPayment,
  type PaymentMethod,
  type PaymentSession,
  type SyncEvent,
} from '@cafepos/domain'
import { useLocale } from './locale-provider'
import { Button } from './ui/button'
import { enqueuePayment } from '@/lib/payment-client'
import {
  PAYMENT_STORAGE_KEY,
  PENDING_PAYMENT_EVENT_KEY,
  parsePendingPaymentEvent,
  serializePayment,
  serializePendingPaymentEvent,
} from '@/lib/payment-storage'

export function PaymentDialog({
  initial,
  onComplete,
}: {
  initial: PaymentSession
  onComplete: (payment: CompletedPayment) => void
}) {
  const { money: formatMoney, t } = useLocale()
  const [session, setSession] = useState(initial)
  const [cash, setCash] = useState(
    (paymentSummary(initial).remaining.minor / 100).toFixed(2),
  )
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const sendingRef = useRef(false)
  const pendingEventRef = useRef<SyncEvent | null>(null)
  const summary = paymentSummary(session)
  const cashMinor = Math.round(Number(cash) * 100)

  useEffect(() => {
    const pending = parsePendingPaymentEvent(
      localStorage.getItem(PENDING_PAYMENT_EVENT_KEY),
    )
    if (pending?.entityId === initial.id) {
      pendingEventRef.current = pending
      setError(true)
    }
  }, [initial.id])

  const sendPaidPayment = async (paid: PaymentSession) => {
    if (sendingRef.current) return
    sendingRef.current = true
    setBusy(true)
    setError(false)
    try {
      const event =
        pendingEventRef.current ??
        completePayment(paid, {
          branchId: 'branch-riverside',
          actorId: 'cashier-local',
          completedAt: new Date().toISOString(),
          eventId: `payment:${paid.id}:v1`,
        }).event
      localStorage.setItem(
        PENDING_PAYMENT_EVENT_KEY,
        serializePendingPaymentEvent(event),
      )
      pendingEventRef.current = event
      await enqueuePayment(event)
      localStorage.removeItem(PAYMENT_STORAGE_KEY)
      localStorage.removeItem(PENDING_PAYMENT_EVENT_KEY)
      pendingEventRef.current = null
      onComplete(validateCompletedPaymentEvent(event))
    } catch {
      setError(true)
    } finally {
      sendingRef.current = false
      setBusy(false)
    }
  }

  const tender = async (method: PaymentMethod, amount: number) => {
    if (sendingRef.current || session.status === 'paid') return
    setError(false)
    try {
      const updated = addPaymentTender(session, {
        id: `${method}-${crypto.randomUUID()}`,
        method,
        amount: money(amount),
        ...(method === 'cash'
          ? {}
          : { reference: `${method.toUpperCase()}-${Date.now()}` }),
      })
      setSession(updated)
      localStorage.setItem(PAYMENT_STORAGE_KEY, serializePayment(updated))
      if (updated.status === 'paid') await sendPaidPayment(updated)
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  const locked = busy || session.status === 'paid'
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-title"
    >
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
        <h2 id="payment-title" className="text-2xl font-semibold">
          {t('takePayment')}
        </h2>
        <p className="mt-1 text-muted-foreground">
          {t('order')} {session.orderId}
        </p>
        <div className="my-6 rounded-xl bg-muted p-5">
          <p className="text-sm text-muted-foreground">{t('remaining')}</p>
          <p className="mt-1 text-3xl font-bold">
            {formatMoney(summary.remaining.minor / 100)}
          </p>
          {summary.paid.minor > 0 && (
            <p className="mt-2 text-sm">
              {t('paid')}: {formatMoney(summary.paid.minor / 100)}
            </p>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive"
          >
            {t('paymentError')}
          </p>
        )}
        {error && session.status === 'paid' && (
          <Button
            className="mb-4 w-full"
            onClick={() => void sendPaidPayment(session)}
            disabled={busy}
          >
            {t('retryPayment')}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            disabled={locked || summary.remaining.minor === 0}
            onClick={() => void tender('card', summary.remaining.minor)}
          >
            <CreditCard aria-hidden="true" />
            {t('card')}
          </Button>
          <Button
            size="lg"
            disabled={locked || summary.remaining.minor === 0}
            onClick={() => void tender('qr', summary.remaining.minor)}
          >
            <QrCode aria-hidden="true" />
            {t('qr')}
          </Button>
        </div>
        <label className="mt-4 block text-sm font-medium">
          {t('cashReceived')}
          <input
            disabled={locked}
            inputMode="decimal"
            value={cash}
            onChange={(event) => {
              if (/^\d*(?:\.\d{0,2})?$/.test(event.target.value))
                setCash(event.target.value)
            }}
            className="mt-2 h-12 w-full rounded-md border bg-background px-3 text-lg"
          />
        </label>
        <Button
          className="mt-3 w-full"
          size="lg"
          disabled={locked || !cashMinor}
          onClick={() => void tender('cash', cashMinor)}
        >
          <WalletCards aria-hidden="true" />
          {t('acceptCash')}
        </Button>
        {cashMinor > summary.remaining.minor && session.status !== 'paid' && (
          <p className="mt-3 text-center font-medium text-primary">
            {t('change')}:{' '}
            {formatMoney((cashMinor - summary.remaining.minor) / 100)}
          </p>
        )}
      </div>
    </div>
  )
}
