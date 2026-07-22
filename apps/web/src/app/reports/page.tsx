'use client'
import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Banknote, CreditCard, QrCode } from 'lucide-react'
import { buildSalesReport } from '@cafepos/domain'
import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Card, CardContent } from '@/components/ui/card'
import {
  HISTORY_STORAGE_KEY,
  emptyHistory,
  parseSaleHistory,
  type SaleHistory,
} from '@/lib/history-storage'

const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export default function ReportsPage() {
  const { money, t } = useLocale()
  const [history, setHistory] = useState<SaleHistory>(emptyHistory)
  const [date, setDate] = useState(today)
  useEffect(() => {
    const load = () =>
      setHistory(parseSaleHistory(localStorage.getItem(HISTORY_STORAGE_KEY)))
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])
  const report = useMemo(() => {
    const from = new Date(`${date}T00:00:00`)
    const to = new Date(from)
    to.setDate(to.getDate() + 1)
    return buildSalesReport(history.receipts, history.refunds, {
      from: from.toISOString(),
      to: to.toISOString(),
    })
  }, [date, history])
  const format = (minor: number) => money(minor / 100)
  const tenderRows: ReadonlyArray<{
    key: 'cashPayment' | 'card' | 'qr'
    Icon: typeof Banknote
    amount: number
  }> = [
    { key: 'cashPayment', Icon: Banknote, amount: report.tenders.cash },
    { key: 'card', Icon: CreditCard, amount: report.tenders.card },
    { key: 'qr', Icon: QrCode, amount: report.tenders.qr },
  ]
  return (
    <AppShell>
      <section className="p-4 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{t('reports')}</h1>
            <p className="mt-2 text-muted-foreground">
              {t('reportsDescription')}
            </p>
          </div>
          <label className="text-sm font-medium">
            {t('businessDate')}
            <input
              type="date"
              className="ms-3 h-10 rounded-md border bg-background px-3"
              value={date}
              onChange={(e) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))
                  setDate(e.target.value)
              }}
            />
          </label>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [t('grossSales'), format(report.grossMinor)],
            [t('refunds'), format(report.refundMinor)],
            [t('netSales'), format(report.netMinor)],
            [t('averageOrder'), format(report.averageOrderMinor)],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold">{t('tenderMix')}</h2>
              <div className="mt-5 space-y-4">
                {tenderRows.map(({ key, Icon, amount }) => (
                  <div className="flex items-center justify-between" key={key}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" aria-hidden="true" />
                      {t(key)}
                    </span>
                    <strong>{format(amount)}</strong>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <BarChart3 aria-hidden="true" />
                {t('topProducts')}
              </h2>
              <div className="mt-5 space-y-3">
                {report.products.length ? (
                  report.products.slice(0, 5).map((product) => (
                    <div
                      className="flex justify-between gap-3"
                      key={product.itemId}
                    >
                      <span>
                        {product.name} · {product.quantity}
                      </span>
                      <strong>{format(product.grossMinor)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">{t('noReportData')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  )
}
