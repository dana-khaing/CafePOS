'use client'

import {
  BarChart3,
  Coffee,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Settings,
  Utensils,
} from 'lucide-react'
import Link from 'next/link'

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

const navigation = [
  { label: 'overview' as const, href: '/' as const, icon: LayoutDashboard },
  { label: 'orders' as const, href: '/' as const, icon: ReceiptText },
  { label: 'kitchen' as const, href: '/' as const, icon: Utensils },
  { label: 'reports' as const, href: '/' as const, icon: BarChart3 },
  { label: 'settings' as const, href: '/' as const, icon: Settings },
]

export function MobileNavigation() {
  const { t } = useLocale()
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
          {navigation.map((item, index) => (
            <SheetClose key={item.label} asChild>
              <Button
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
            </SheetClose>
          ))}
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
