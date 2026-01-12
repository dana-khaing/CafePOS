'use client'

import {
  BarChart3,
  BookOpen,
  Coffee,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Settings,
  Utensils,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Route } from 'next'

import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const navigation: ReadonlyArray<{
  label: 'overview' | 'menu' | 'orders' | 'kitchen' | 'reports' | 'settings'
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
    label: 'kitchen',
    href: '/kitchen' as Route,
    icon: Utensils,
    available: true,
  },
  { label: 'reports', href: '/', icon: BarChart3, available: false },
  { label: 'settings', href: '/', icon: Settings, available: false },
]

export function MobileNavigation() {
  const { t } = useLocale()
  const pathname = usePathname()
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={t('openNavigation')}
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-describedby="mobile-navigation-description"
        closeLabel={t('closeNavigation')}
      >
        <SheetTitle className="flex h-14 items-center gap-3 px-2 pe-12">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Coffee className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight">CafePOS</span>
        </SheetTitle>
        <SheetDescription
          id="mobile-navigation-description"
          className="sr-only"
        >
          {t('navigationDescription')}
        </SheetDescription>
        <nav aria-label={t('mobileNavigation')} className="mt-6 grid gap-1">
          {navigation.map((item) =>
            item.available ? (
              <SheetClose key={item.label} asChild>
                <Button
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
              </SheetClose>
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
      </SheetContent>
    </Sheet>
  )
}
