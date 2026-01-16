'use client'
import { Banknote, LockKeyhole, Plus, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  addCashMovement,
  closeCashShift,
  expectedDrawerCash,
  money,
  openCashShift,
  type CashMovement,
} from '@cafepos/domain'
import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { verifyManagerPin } from '@/lib/manager-client'
import {
  SHIFT_STORAGE_KEY,
  emptyShiftLedger,
  parseShiftLedger,
  serializeShiftLedger,
  type ShiftLedger,
} from '@/lib/shift-storage'

export default function ShiftsPage() {
  const { money: formatMoney, t } = useLocale()
  const [ledger, setLedger] = useState<ShiftLedger>(emptyShiftLedger)
  const [mode, setMode] = useState<
    'open' | 'paid-in' | 'paid-out' | 'close' | null
  >(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(
    () => setLedger(parseShiftLedger(localStorage.getItem(SHIFT_STORAGE_KEY))),
    [],
  )
  const save = (next: ShiftLedger) => {
    localStorage.setItem(SHIFT_STORAGE_KEY, serializeShiftLedger(next))
    setLedger(next)
  }
  const perform = async () => {
    if (!mode) return
    setBusy(true)
    setError(false)
    try {
      await verifyManagerPin(pin)
      const minor = Math.round(Number(amount) * 100)
      if (mode === 'open') {
        const current = openCashShift({
          id: `shift-${crypto.randomUUID()}`,
          branchId: 'branch-riverside',
          actorId: 'manager-approved',
          actorRole: 'manager',
          openedAt: new Date().toISOString(),
          openingFloat: money(minor),
        })
        save({ ...ledger, current })
      } else if (ledger.current && mode === 'close') {
        const closed = closeCashShift(ledger.current, {
          actorId: 'manager-approved',
          actorRole: 'manager',
          closedAt: new Date().toISOString(),
          countedCash: money(minor),
        })
        save({ current: null, archive: [closed, ...ledger.archive] })
      } else if (ledger.current) {
        const movement: CashMovement = {
          id: crypto.randomUUID(),
          type: mode as 'paid-in' | 'paid-out',
          amount: money(minor),
          reason,
          occurredAt: new Date().toISOString(),
        }
        save({ ...ledger, current: addCashMovement(ledger.current, movement) })
      }
      setMode(null)
      setAmount('')
      setReason('')
      setPin('')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  const current = ledger.current
  return (
    <AppShell>
      <section className="p-4 md:p-8">
        <div>
          <h1 className="text-3xl font-semibold">{t('cashShift')}</h1>
          <p className="mt-2 text-muted-foreground">
            {t('cashShiftDescription')}
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-destructive/10 p-3 text-destructive"
          >
            {t('managerApprovalError')}
          </p>
        )}
        {current ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">
                    {t('openingFloat')}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatMoney(current.openingFloat.minor / 100)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">
                    {t('expectedCash')}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatMoney(expectedDrawerCash(current).minor / 100)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">
                    {t('movementCount')}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {current.movements.length}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setMode('paid-in')}>
                <Plus aria-hidden="true" />
                {t('paidIn')}
              </Button>
              <Button variant="outline" onClick={() => setMode('paid-out')}>
                <Minus aria-hidden="true" />
                {t('paidOut')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setMode('close')
                  setAmount(
                    (expectedDrawerCash(current).minor / 100).toFixed(2),
                  )
                }}
              >
                <LockKeyhole aria-hidden="true" />
                {t('closeShift')}
              </Button>
            </div>
            <div className="mt-6 space-y-2">
              {current.movements.map((entry) => (
                <div
                  className="flex justify-between rounded-lg border bg-card p-3 text-sm"
                  key={entry.id}
                >
                  <span>
                    {t(
                      entry.type === 'sale'
                        ? 'cashSale'
                        : entry.type === 'refund'
                          ? 'cashRefund'
                          : entry.type === 'paid-in'
                            ? 'paidIn'
                            : 'paidOut',
                    )}{' '}
                    · {entry.reason}
                  </span>
                  <span>
                    {entry.type === 'paid-out' || entry.type === 'refund'
                      ? '-'
                      : '+'}
                    {formatMoney(entry.amount.minor / 100)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Card className="mt-6 max-w-xl">
            <CardContent className="p-8 text-center">
              <Banknote
                className="mx-auto size-10 text-primary"
                aria-hidden="true"
              />
              <h2 className="mt-3 text-xl font-semibold">{t('noOpenShift')}</h2>
              <Button
                className="mt-5"
                onClick={() => {
                  setMode('open')
                  setAmount('500.00')
                }}
              >
                {t('openShift')}
              </Button>
            </CardContent>
          </Card>
        )}
        {mode && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">
                {t(
                  mode === 'open'
                    ? 'openShift'
                    : mode === 'close'
                      ? 'closeShift'
                      : mode === 'paid-in'
                        ? 'paidIn'
                        : 'paidOut',
                )}
              </h2>
              <label className="mt-4 block text-sm font-medium">
                {t(mode === 'close' ? 'countedCash' : 'amount')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              {(mode === 'paid-in' || mode === 'paid-out') && (
                <label className="mt-4 block text-sm font-medium">
                  {t('reason')}
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              )}
              <label className="mt-4 block text-sm font-medium">
                {t('managerPin')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setMode(null)}>
                  {t('cancel')}
                </Button>
                <Button
                  disabled={
                    busy ||
                    !/^\d+(?:\.\d{1,2})?$/.test(amount) ||
                    pin.length < 4 ||
                    ((mode === 'paid-in' || mode === 'paid-out') &&
                      !reason.trim())
                  }
                  onClick={() => void perform()}
                >
                  {t('confirm')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  )
}
