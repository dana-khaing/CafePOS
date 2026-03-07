'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Route } from 'next'
import {
  ArrowRight,
  LayoutGrid,
  Plus,
  ReceiptText,
  Utensils,
} from 'lucide-react'
import Link from 'next/link'
import {
  expectedDrawerCash,
  refundedTotal,
  validateRefundEvent,
} from '@cafepos/domain'

import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { dateInTimezone } from '@/lib/business-time'
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
import {
  SHIFT_STORAGE_KEY,
  emptyShiftLedger,
  parseShiftLedger,
  type ShiftLedger,
} from '@/lib/shift-storage'
import { buildWeeklySalesComparison } from '@/lib/sales-summary'

const quickActions = [
  {
    label: 'counterService' as const,
    description: 'counterDetail' as const,
    icon: Plus,
    href: '/orders' as Route,
  },
  {
    label: 'diningRoom' as const,
    description: 'diningDetail' as const,
    icon: LayoutGrid,
    href: '/orders?mode=table' as Route,
  },
  {
    label: 'kitchenQueue' as const,
    description: 'kitchenDetail' as const,
    icon: Utensils,
    href: '/kitchen' as Route,
  },
]

export default function HomePage() {
  const { date, locale, money, t } = useLocale()
  const [history, setHistory] = useState<SaleHistory>(emptyHistory())
  const [settings, setSettings] = useState(defaultSettings())
  const [shiftLedger, setShiftLedger] = useState<ShiftLedger>(emptyShiftLedger)
  const [settingsError, setSettingsError] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [businessDate, setBusinessDate] = useState(() =>
    dateInTimezone(new Date(), defaultSettings().timezone),
  )

  useEffect(() => {
    const load = () => {
      setHistory(parseSaleHistory(localStorage.getItem(HISTORY_STORAGE_KEY)))
      setShiftLedger(parseShiftLedger(localStorage.getItem(SHIFT_STORAGE_KEY)))
      try {
        const next = parseSettings(localStorage.getItem(SETTINGS_STORAGE_KEY))
        setSettings(next)
        setBusinessDate(dateInTimezone(new Date(), next.timezone))
        setSettingsError(false)
      } catch {
        // Keep validated defaults if settings storage is corrupt, but let
        // the operator know the branch name/timezone shown may be wrong.
        setSettingsError(true)
      }
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(ticker)
  }, [])

  const currentShift = shiftLedger.current
  const shiftDuration = useMemo(() => {
    if (!currentShift) return null
    const minutes = Math.max(
      0,
      Math.floor((now - Date.parse(currentShift.openedAt)) / 60_000),
    )
    return `${Math.floor(minutes / 60)}${t('hoursUnit')} ${minutes % 60}${t('minutesUnit')}`
  }, [currentShift, now, t])

  const sales = useMemo(
    () => buildWeeklySalesComparison(history, businessDate, settings.timezone),
    [businessDate, history, settings.timezone],
  )
  const comparisonLabel = useMemo(() => {
    if (sales.percentChange === null) return t('noComparisonData')
    const percentage = new Intl.NumberFormat(locale, {
      style: 'percent',
      signDisplay: 'always',
      maximumFractionDigits: 1,
    }).format(sales.percentChange / 100)
    const weekday = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
    }).format(new Date(`${sales.comparisonDate}T12:00:00Z`))
    return locale === 'th'
      ? `${percentage} จากวัน${weekday}ที่แล้ว`
      : `${percentage} vs last ${weekday}`
  }, [locale, sales.comparisonDate, sales.percentChange, t])
  const comparisonVariant =
    sales.percentChange === null
      ? 'outline'
      : sales.percentChange > 0
        ? 'success'
        : sales.percentChange < 0
          ? 'warning'
          : 'outline'
  const recentActivity = useMemo(
    () =>
      [...history.receipts]
        .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt))
        .slice(0, 5)
        .map((receipt) => {
          const refunds = [
            ...history.refunds,
            ...history.pendingRefunds.map(validateRefundEvent),
          ].filter((entry) => entry.receiptId === receipt.id)
          const refunded = refundedTotal(
            refunds,
            receipt.totals.gross.currency,
          ).minor
          const status =
            refunded > 0 && refunded >= receipt.totals.gross.minor
              ? ('fullyRefunded' as const)
              : refunded > 0
                ? ('refunded' as const)
                : ('paid' as const)
          const mode = receipt.order.diningMode
          const modeLabel =
            mode === 'table'
              ? `${t('table')} ${receipt.order.tableNumber ?? ''}`.trim()
              : t(mode)
          return {
            id: receipt.id,
            reference: receipt.number,
            detail: `${modeLabel} · ${receipt.order.lines.length} ${t('itemCount')}`,
            totalMinor: receipt.totals.gross.minor,
            status,
          }
        }),
    [history, t],
  )
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
        {settingsError && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            {t('settingsDataReset')}
          </p>
        )}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {date(new Date(`${businessDate}T12:00:00Z`))}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {t('greeting')}
            </h1>
            <p className="mt-2 text-muted-foreground">{t('branch')}</p>
          </div>
          <Button size="lg" asChild>
            <Link href="/orders">
              <Plus aria-hidden="true" />
              {t('newOrder')}
            </Link>
          </Button>
        </section>

        <section aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="sr-only">
            {t('quickActions')}
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href} className="block">
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center gap-4 p-5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <action.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {t(action.label)}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {t(action.description)}
                      </span>
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('netSales')}</CardDescription>
              <CardTitle className="font-mono text-2xl">
                {money(sales.current.netMinor / 100)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={comparisonVariant}>{comparisonLabel}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('orders')}</CardDescription>
              <CardTitle className="font-mono text-2xl">
                {sales.current.orderCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t('average')} {money(sales.current.averageOrderMinor / 100)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('currentShift')}</CardDescription>
              <CardTitle className="text-2xl">
                {currentShift
                  ? `${t('shiftOpen')} · ${shiftDuration}`
                  : t('noOpenShift')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentShift ? (
                <Badge variant="outline">
                  {t('expectedCash')}:{' '}
                  {money(expectedDrawerCash(currentShift).minor / 100)}
                </Badge>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/shifts">
                    {t('openShift')}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>{t('recentActivity')}</CardTitle>
              <CardDescription>{t('latestOrders')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/history">
                {t('viewAll')}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-1">
            {recentActivity.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t('noRecentActivity')}
              </p>
            ) : (
              recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-muted"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary">
                    <ReceiptText className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-sm font-semibold">
                      {item.reference}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block font-mono text-sm font-semibold">
                      {money(item.totalMinor / 100)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t(item.status)}
                    </span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
