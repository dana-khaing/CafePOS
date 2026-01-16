'use client'

import {
  BarChart3,
  BookOpen,
  Coffee,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Utensils,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Route } from 'next'
import type { ReactNode } from 'react'

import { ConnectivityChip } from '@/components/connectivity-chip'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from '@/components/locale-provider'
import { MobileNavigation } from '@/components/mobile-navigation'
import { Button } from '@/components/ui/button'

const navigation: ReadonlyArray<{
  label:
    | 'overview'
    | 'menu'
    | 'orders'
    | 'history'
    | 'shifts'
    | 'kitchen'
    | 'reports'
    | 'settings'
  href: Route
  icon: typeof LayoutDashboard
  available: boolean
}> = [
  { label: 'overview', href: '/', icon: LayoutDashboard, available: true },
  { label: 'menu', href: '/menu', icon: BookOpen, available: true },
  {
    label: 'orders',
    href: '/orders' as Route,
    icon: ReceiptText,
    available: true,
  },
  {
    label: 'history',
    href: '/history' as Route,
    icon: ReceiptText,
    available: true,
  },
  {
    label: 'shifts',
    href: '/shifts' as Route,
    icon: ReceiptText,
    available: true,
  },
  {
    label: 'kitchen',
    href: '/kitchen' as Route,
    icon: Utensils,
    available: true,
  },
  { label: 'reports', href: '/', icon: BarChart3, available: false },
  { label: 'settings', href: '/', icon: Settings, available: false },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useLocale()
  const pathname = usePathname()
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-e bg-card p-4 lg:flex">
        <div className="flex h-14 items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Coffee className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">
              CafePOS
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('cafeName')}
            </span>
          </span>
        </div>

        <nav aria-label={t('primaryNavigation')} className="mt-6 grid gap-1">
          {navigation.map((item) =>
            item.available ? (
              <Button
                key={item.label}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className="justify-start"
                asChild
              >
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  <item.icon aria-hidden="true" />
                  {t(item.label)}
                </Link>
              </Button>
            ) : (
              <Button
                key={item.label}
                variant="ghost"
                className="justify-start"
                disabled
                title={t('featureComingSoon')}
              >
                <item.icon aria-hidden="true" />
                {t(item.label)}
              </Button>
            ),
          )}
        </nav>

        <div className="mt-auto rounded-lg bg-muted p-3 text-sm">
          <span className="font-medium">{t('branchHub')}</span>
          <span className="mt-1 block text-muted-foreground">
            {t('lastSync')}
          </span>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <MobileNavigation />
            <ConnectivityChip />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <LanguageSwitcher />
            <span className="hidden text-muted-foreground sm:inline">
              {t('cashier')}
            </span>
            <span
              className="grid size-9 place-items-center rounded-full bg-secondary font-semibold"
              aria-label={t('signedIn')}
            >
              MK
            </span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
