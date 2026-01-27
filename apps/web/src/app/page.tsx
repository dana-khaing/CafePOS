'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  LayoutGrid,
  Plus,
  ReceiptText,
  Utensils,
} from 'lucide-react'
import Link from 'next/link'

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
import { buildWeeklySalesComparison } from '@/lib/sales-summary'

const quickActions = [
  {
    label: 'counterService' as const,
    description: 'counterDetail' as const,
    icon: Plus,
  },
  {
    label: 'diningRoom' as const,
    description: 'diningDetail' as const,
    icon: LayoutGrid,
  },
  {
    label: 'kitchenQueue' as const,
    description: 'kitchenDetail' as const,
    icon: Utensils,
  },
]

const activity = [
  {
    reference: '#1042',
    detail: 'tableItems' as const,
    total: 640,
    status: 'preparing' as const,
  },
  {
    reference: '#1041',
    detail: 'takeawayItems' as const,
    total: 185,
    status: 'ready' as const,
  },
  {
    reference: '#1040',
    detail: 'counterItems' as const,
    total: 320,
    status: 'paid' as const,
  },
]

export default function HomePage() {
  const { date, locale, money, t } = useLocale()
  const [history, setHistory] = useState<SaleHistory>(emptyHistory())
  const [settings, setSettings] = useState(defaultSettings())
  const [businessDate, setBusinessDate] = useState(() =>
    dateInTimezone(new Date(), defaultSettings().timezone),
  )

  useEffect(() => {
    const load = () => {
      setHistory(parseSaleHistory(localStorage.getItem(HISTORY_STORAGE_KEY)))
      try {
        const next = parseSettings(localStorage.getItem(SETTINGS_STORAGE_KEY))
        setSettings(next)
        setBusinessDate(dateInTimezone(new Date(), next.timezone))
      } catch {
        // Keep validated defaults if settings storage is corrupt.
      }
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

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
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
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
              <Card key={action.label}>
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
              <CardTitle className="text-2xl">{t('shiftOpen')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{t('till')}</Badge>
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
            {activity.map((item) => (
              <div
                key={item.reference}
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
                    {t(item.detail)}
                  </span>
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block font-mono text-sm font-semibold">
                    {money(item.total)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(item.status)}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
