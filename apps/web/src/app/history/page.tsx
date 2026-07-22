'use client'

import { RotateCcw, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createRefund,
  money,
  refundedTotal,
  validateRefundEvent,
  type Receipt,
  type SyncEvent,
} from '@cafepos/domain'
import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { enqueueRefund } from '@/lib/refund-client'
import { recordCashRefund, updateStoredShiftLedger } from '@/lib/shift-storage'
import {
  HISTORY_STORAGE_KEY,
  emptyHistory,
  parseSaleHistory,
  serializeSaleHistory,
  settleRefund,
  stageRefund,
  type SaleHistory,
} from '@/lib/history-storage'

export default function HistoryPage() {
  const { locale, money: formatMoney, t } = useLocale()
  const [history, setHistory] = useState<SaleHistory>(emptyHistory)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Receipt | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [managerPin, setManagerPin] = useState('')
  const [pendingRetry, setPendingRetry] = useState<SyncEvent | null>(null)
  const [error, setError] = useState(false)
  const sendingRef = useRef(false)
  useEffect(
    () =>
      setHistory(parseSaleHistory(localStorage.getItem(HISTORY_STORAGE_KEY))),
    [],
  )
  const save = (next: SaleHistory) => {
    localStorage.setItem(HISTORY_STORAGE_KEY, serializeSaleHistory(next))
    setHistory(next)
  }
  const shown = useMemo(
    () =>
      history.receipts.filter((receipt) =>
        `${receipt.number} ${receipt.order.id} ${receipt.order.lines.map((line) => line.name).join(' ')}`
          .toLocaleLowerCase(locale)
          .includes(query.toLocaleLowerCase(locale)),
      ),
    [history.receipts, locale, query],
  )
  const refundsFor = (receipt: Receipt) => [
    ...history.refunds.filter((entry) => entry.receiptId === receipt.id),
    ...history.pendingRefunds
      .map(validateRefundEvent)
      .filter((entry) => entry.receiptId === receipt.id),
  ]
  const remaining = (receipt: Receipt) =>
    receipt.totals.gross.minor -
    refundedTotal(refundsFor(receipt), receipt.totals.gross.currency).minor
  const send = async (receipt: Receipt, event: SyncEvent) => {
    if (sendingRef.current) return
    sendingRef.current = true
    setError(false)
    try {
      const staged = stageRefund(history, event)
      save(staged)
      setPendingRetry(event)
      await enqueueRefund(receipt, event, managerPin)
      await updateStoredShiftLedger(localStorage, (ledger) =>
        recordCashRefund(ledger, receipt, validateRefundEvent(event)),
      )
      const settled = settleRefund(staged, event.id)
      save(settled)
      setSelected(null)
      setAmount('')
      setReason('')
      setManagerPin('')
      setPendingRetry(null)
    } catch {
      setError(true)
    } finally {
      sendingRef.current = false
    }
  }
  const submit = () => {
    if (!selected) return
    if (pendingRetry) {
      void send(selected, pendingRetry)
      return
    }
    try {
      const result = createRefund(selected, refundsFor(selected), {
        id: crypto.randomUUID(),
        actorId: 'manager-local',
        actorRole: 'manager',
        reason,
        amount: money(
          Math.round(Number(amount) * 100),
          selected.totals.gross.currency,
        ),
        createdAt: new Date().toISOString(),
      })
      void send(selected, result.event)
    } catch {
      setError(true)
    }
  }
  return (
    <AppShell>
      <section className="p-4 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{t('saleHistory')}</h1>
            <p className="mt-2 text-muted-foreground">
              {t('historyDescription')}
            </p>
          </div>
          {history.pendingRefunds.map((event) => (
            <Button
              key={event.id}
              variant="outline"
              onClick={() => {
                const refund = validateRefundEvent(event)
                const receipt = history.receipts.find(
                  (entry) => entry.id === refund.receiptId,
                )
                if (receipt) {
                  setSelected(receipt)
                  setPendingRetry(event)
                  setAmount((refund.amount.minor / 100).toFixed(2))
                  setReason(refund.reason)
                  setManagerPin('')
                }
              }}
            >
              {t('retryRefund')} · {validateRefundEvent(event).id}
            </Button>
          ))}
        </div>
        <label className="relative mt-6 block max-w-md">
          <span className="sr-only">{t('searchHistory')}</span>
          <Search
            className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            className="h-11 w-full rounded-md border bg-background ps-10 pe-3"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchHistory')}
          />
        </label>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-destructive/10 p-3 text-destructive"
          >
            {t('refundError')}
          </p>
        )}
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {shown.map((receipt) => {
            const refunded = refundedTotal(
              refundsFor(receipt),
              receipt.totals.gross.currency,
            ).minor
            const left = remaining(receipt)
            return (
              <Card key={receipt.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm">{receipt.number}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {new Intl.DateTimeFormat(
                          locale === 'th' ? 'th-TH' : 'en-GB',
                          { dateStyle: 'medium', timeStyle: 'short' },
                        ).format(new Date(receipt.issuedAt))}
                      </p>
                    </div>
                    <p className="text-xl font-semibold">
                      {formatMoney(receipt.totals.gross.minor / 100)}
                    </p>
                  </div>
                  <p className="mt-4 text-sm">
                    {receipt.order.lines
                      .map((line) => `${line.quantity}× ${line.name}`)
                      .join(', ')}
                  </p>
                  {refunded > 0 && (
                    <p className="mt-3 text-sm text-destructive">
                      {t('refunded')}: {formatMoney(refunded / 100)}
                    </p>
                  )}
                  <Button
                    className="mt-4"
                    variant="outline"
                    disabled={left === 0}
                    onClick={() => {
                      setSelected(receipt)
                      setAmount((left / 100).toFixed(2))
                      setReason('')
                    }}
                  >
                    <RotateCcw aria-hidden="true" />
                    {left === 0 ? t('fullyRefunded') : t('refund')}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        {shown.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">
            {t('noHistory')}
          </p>
        )}
        {selected && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-title"
          >
            <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
              <h2 id="refund-title" className="text-2xl font-semibold">
                {t('refund')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected.number}
              </p>
              <label className="mt-5 block text-sm font-medium">
                {t('refundAmount')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                {t('refundReason')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                {t('managerPin')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={managerPin}
                  onChange={(event) =>
                    setManagerPin(event.target.value.replace(/\D/g, ''))
                  }
                />
              </label>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(null)
                    setPendingRetry(null)
                    setManagerPin('')
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button
                  disabled={
                    !reason.trim() ||
                    !/^\d+(?:\.\d{1,2})?$/.test(amount) ||
                    !Number(amount) ||
                    managerPin.length < 4
                  }
                  onClick={submit}
                >
                  {t('confirmRefund')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  )
}
