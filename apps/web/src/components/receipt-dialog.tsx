'use client'

import { Printer, ReceiptText } from 'lucide-react'
import type { Receipt } from '@cafepos/domain'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useLocale } from './locale-provider'
import { Button } from './ui/button'

export function ReceiptDialog({
  receipt,
  onDone,
}: {
  receipt: Receipt
  onDone: () => void
}) {
  const { locale, money, t } = useLocale()
  const dialogRef = useRef<HTMLDivElement>(null)
  const amount = (minor: number) => money(minor / 100)
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])
  const containFocus = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button')
    if (!controls?.length) return
    const first = controls[0]!
    const last = controls[controls.length - 1]!
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === dialogRef.current)
    ) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  return (
    <div
      className="receipt-overlay fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={containFocus}
    >
      <article className="receipt-paper w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <header className="text-center">
          <ReceiptText
            className="mx-auto size-8 text-primary"
            aria-hidden="true"
          />
          <h2 id="receipt-title" className="mt-2 text-2xl font-semibold">
            {t('receipt')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('cafeName')}</p>
        </header>
        <dl className="my-5 grid grid-cols-2 gap-1 border-y py-4 text-sm">
          <dt>{t('receiptNumber')}</dt>
          <dd className="text-end font-mono">{receipt.number}</dd>
          <dt>{t('issuedAt')}</dt>
          <dd className="text-end">
            {new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(receipt.issuedAt))}
          </dd>
          <dt>{t('order')}</dt>
          <dd className="truncate text-end">{receipt.order.id}</dd>
        </dl>
        <div className="space-y-3">
          {receipt.order.lines.map((line) => (
            <div key={line.id} className="flex gap-3 text-sm">
              <span className="flex-1">
                <strong>
                  {line.quantity}× {line.name}
                </strong>
                {line.modifiers.length > 0 && (
                  <small className="block text-muted-foreground">
                    {line.modifiers.map((entry) => entry.name).join(', ')}
                  </small>
                )}
              </span>
              <span>
                {amount(
                  (line.unitPrice.minor +
                    line.modifiers.reduce(
                      (sum, entry) => sum + entry.priceDelta.minor,
                      0,
                    )) *
                    line.quantity,
                )}
              </span>
            </div>
          ))}
        </div>
        <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <dt>{t('subtotal')}</dt>
            <dd>{amount(receipt.totals.net.minor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('tax')}</dt>
            <dd>{amount(receipt.totals.tax.minor)}</dd>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <dt>{t('total')}</dt>
            <dd>{amount(receipt.totals.gross.minor)}</dd>
          </div>
          {receipt.payment.session.tenders.map((tender) => (
            <div className="flex justify-between" key={tender.id}>
              <dt>
                {t(tender.method === 'cash' ? 'cashPayment' : tender.method)}
              </dt>
              <dd>{amount(tender.amount.minor)}</dd>
            </div>
          ))}
          {receipt.payment.summary.change.minor > 0 && (
            <div className="flex justify-between font-medium">
              <dt>{t('change')}</dt>
              <dd>{amount(receipt.payment.summary.change.minor)}</dd>
            </div>
          )}
        </dl>
        <p className="mt-6 text-center text-sm">{t('thankYou')}</p>
        <div className="receipt-actions mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            {t('printReceipt')}
          </Button>
          <Button onClick={onDone}>{t('newOrder')}</Button>
        </div>
      </article>
    </div>
  )
}
