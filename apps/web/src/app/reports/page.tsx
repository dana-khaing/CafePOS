'use client'
import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Banknote, CreditCard, QrCode } from 'lucide-react'
import { buildSalesReport } from '@cafepos/domain'
import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { businessDayRange, dateInTimezone } from '@/lib/business-time'
import {
  HISTORY_STORAGE_KEY,
  emptyHistory,
  parseSaleHistory,
  type SaleHistory,
} from '@/lib/history-storage'
import {
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  parseSettings,
} from '@/lib/settings-storage'
import { buildDailySalesSummaries } from '@/lib/sales-summary'

export default function ReportsPage() {
  const { locale, money, t } = useLocale()
  const [history, setHistory] = useState<SaleHistory>(emptyHistory)
  const [settings, setSettings] = useState(defaultSettings)
  const [date, setDate] = useState(() =>
    dateInTimezone(new Date(), defaultSettings().timezone),
  )
  useEffect(() => {
    const load = () => {
      setHistory(parseSaleHistory(localStorage.getItem(HISTORY_STORAGE_KEY)))
      try {
        const next = parseSettings(localStorage.getItem(SETTINGS_STORAGE_KEY))
        setSettings(next)
        setDate(dateInTimezone(new Date(), next.timezone))
      } catch {
        // Keep validated defaults if settings storage is corrupt.
      }
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])
  const report = useMemo(() => {
    const { from, to } = businessDayRange(date, settings.timezone)
    return buildSalesReport(history.receipts, history.refunds, {
      from,
      to,
    })
  }, [date, history, settings.timezone])
  const salesSeries = useMemo(
    () => buildDailySalesSummaries(history, date, settings.timezone),
    [date, history, settings.timezone],
  )
  const format = (minor: number) => money(minor / 100)
  const formatSeriesDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${value}T12:00:00Z`))
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
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{t('twoWeekSales')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('twoWeekSalesDescription')}
                </p>
              </div>
              <Badge variant="outline">{date}</Badge>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[1.25fr_0.6fr_0.8fr_0.8fr] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{t('businessDate')}</span>
                <span className="text-end">{t('dailyOrders')}</span>
                <span className="text-end">{t('dailyNetSales')}</span>
                <span className="text-end">{t('dailyRefunds')}</span>
              </div>
              <div className="divide-y">
                {salesSeries.map(({ date: salesDate, report: dailyReport }) => {
                  const hasSales =
                    dailyReport.orderCount > 0 || dailyReport.netMinor > 0
                  return (
                    <div
                      className="grid grid-cols-[1.25fr_0.6fr_0.8fr_0.8fr] gap-3 px-4 py-3 text-sm"
                      key={salesDate}
                    >
                      <span className="font-medium">
                        {formatSeriesDate(salesDate)}
                      </span>
                      <span className="text-end">
                        {hasSales ? dailyReport.orderCount : '—'}
                      </span>
                      <span className="text-end font-medium">
                        {format(dailyReport.netMinor)}
                      </span>
                      <span className="text-end text-muted-foreground">
                        {format(dailyReport.refundMinor)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  )
}
