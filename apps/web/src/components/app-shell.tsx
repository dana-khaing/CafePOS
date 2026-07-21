'use client'

import {
  BarChart3,
  Coffee,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Utensils,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ConnectivityChip } from '@/components/connectivity-chip'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from '@/components/locale-provider'
import { MobileNavigation } from '@/components/mobile-navigation'
import { Button } from '@/components/ui/button'

const navigation = [
  { label: 'overview' as const, href: '/' as const, icon: LayoutDashboard },
  { label: 'orders' as const, href: '/' as const, icon: ReceiptText },
  { label: 'kitchen' as const, href: '/' as const, icon: Utensils },
  { label: 'reports' as const, href: '/' as const, icon: BarChart3 },
  { label: 'settings' as const, href: '/' as const, icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useLocale()
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
          {navigation.map((item, index) => (
            <Button
              key={item.label}
              variant={index === 0 ? 'secondary' : 'ghost'}
              className="justify-start"
              asChild
            >
              <Link
                href={item.href}
                aria-current={index === 0 ? 'page' : undefined}
              >
                <item.icon aria-hidden="true" />
                {t(item.label)}
              </Link>
            </Button>
          ))}
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
