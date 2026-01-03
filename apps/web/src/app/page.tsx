'use client'

import {
  ArrowRight,
  LayoutGrid,
  Plus,
  ReceiptText,
  Utensils,
} from 'lucide-react'

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
  const { date, money, t } = useLocale()
  const dashboardDate = new Date(2026, 6, 21)
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {date(dashboardDate)}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {t('greeting')}
            </h1>
            <p className="mt-2 text-muted-foreground">{t('branch')}</p>
          </div>
          <Button size="lg" disabled title={t('orderingComingSoon')}>
            <Plus aria-hidden="true" />
            {t('newOrder')}
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
                {money(12840)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="success">{t('salesComparison')}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('orders')}</CardDescription>
              <CardTitle className="font-mono text-2xl">48</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t('average')} {money(267.5)}
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
            <Button
              variant="ghost"
              size="sm"
              disabled
              title={t('historyComingSoon')}
            >
              {t('viewAll')}
              <ArrowRight aria-hidden="true" />
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
