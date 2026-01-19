'use client'

import { Check, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { money, setMenuItemAvailability, type Menu } from '@cafepos/domain'

import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  MENU_STORAGE_KEY,
  parseStoredMenu,
  serializeMenu,
} from '@/lib/menu-storage'
import { withCriticalStorageLock } from '@/lib/storage-lock'

const initialMenu: Menu = {
  currency: 'THB',
  categories: [
    { id: 'coffee', name: { en: 'Coffee', th: 'กาแฟ' }, sortOrder: 0 },
    { id: 'tea', name: { en: 'Tea', th: 'ชา' }, sortOrder: 1 },
    { id: 'bakery', name: { en: 'Bakery', th: 'เบเกอรี่' }, sortOrder: 2 },
  ],
  modifierGroups: [
    {
      id: 'milk',
      name: { en: 'Milk choice', th: 'เลือกนม' },
      minimum: 0,
      maximum: 1,
      options: [
        {
          id: 'oat',
          name: { en: 'Oat milk', th: 'นมโอ๊ต' },
          priceDelta: money(2000),
          available: true,
        },
        {
          id: 'soy',
          name: { en: 'Soy milk', th: 'นมถั่วเหลือง' },
          priceDelta: money(1500),
          available: true,
        },
      ],
    },
    {
      id: 'size',
      name: { en: 'Size', th: 'ขนาด' },
      minimum: 1,
      maximum: 1,
      options: [
        {
          id: 'regular',
          name: { en: 'Regular', th: 'ปกติ' },
          priceDelta: money(0),
          available: true,
        },
        {
          id: 'large',
          name: { en: 'Large', th: 'ใหญ่' },
          priceDelta: money(2500),
          available: true,
        },
      ],
    },
  ],
  items: [
    {
      id: 'espresso',
      categoryId: 'coffee',
      sku: 'COF-ESP',
      name: { en: 'Espresso', th: 'เอสเปรสโซ' },
      price: money(8000),
      taxRateId: 'vat7',
      available: true,
      modifierGroupIds: ['size'],
    },
    {
      id: 'latte',
      categoryId: 'coffee',
      sku: 'COF-LAT',
      name: { en: 'Café latte', th: 'คาเฟ่ลาเต้' },
      price: money(12000),
      taxRateId: 'vat7',
      available: true,
      modifierGroupIds: ['milk', 'size'],
    },
    {
      id: 'cold-brew',
      categoryId: 'coffee',
      sku: 'COF-CBR',
      name: { en: 'Cold brew', th: 'โคลด์บรูว์' },
      price: money(13500),
      taxRateId: 'vat7',
      available: false,
      modifierGroupIds: ['size'],
    },
    {
      id: 'thai-tea',
      categoryId: 'tea',
      sku: 'TEA-THA',
      name: { en: 'Thai milk tea', th: 'ชาไทย' },
      price: money(9500),
      taxRateId: 'vat7',
      available: true,
      modifierGroupIds: ['milk', 'size'],
    },
    {
      id: 'matcha',
      categoryId: 'tea',
      sku: 'TEA-MAT',
      name: { en: 'Matcha latte', th: 'มัทฉะลาเต้' },
      price: money(13000),
      taxRateId: 'vat7',
      available: true,
      modifierGroupIds: ['milk', 'size'],
    },
    {
      id: 'croissant',
      categoryId: 'bakery',
      sku: 'BAK-CRO',
      name: { en: 'Butter croissant', th: 'ครัวซองต์เนย' },
      price: money(9000),
      taxRateId: 'vat7',
      available: true,
      modifierGroupIds: [],
    },
  ],
}

export default function MenuPage() {
  const { locale, money: formatMoney, t } = useLocale()
  const [menu, setMenu] = useState(initialMenu)
  const [storageReady, setStorageReady] = useState(false)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    try {
      setMenu(
        parseStoredMenu(
          window.localStorage.getItem(MENU_STORAGE_KEY),
          initialMenu,
        ),
      )
    } catch {
      setMenu(initialMenu)
    }
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (storageReady) {
      void withCriticalStorageLock(() =>
        window.localStorage.setItem(MENU_STORAGE_KEY, serializeMenu(menu)),
      ).catch(() => {
        // Storage may be unavailable in private or locked-down browser modes.
      })
    }
  }, [menu, storageReady])

  const categoryNames = new Map(
    menu.categories.map((entry) => [entry.id, entry.name]),
  )
  const items = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    return menu.items.filter((item) => {
      const matchesCategory = category === 'all' || item.categoryId === category
      const names =
        `${item.name.en} ${item.name.th ?? ''} ${item.sku}`.toLocaleLowerCase(
          locale,
        )
      return matchesCategory && (!normalized || names.includes(normalized))
    })
  }, [category, locale, menu.items, query])

  const label = (text: { en: string; th?: string }) =>
    locale === 'th' && text.th ? text.th : text.en

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('menuTitle')}
          </h1>
          <p className="mt-2 text-muted-foreground">{t('menuDescription')}</p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">{t('searchMenu')}</span>
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-10 w-full rounded-md border bg-card ps-9 pe-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            aria-label={t('menu')}
          >
            <Button
              size="sm"
              variant={category === 'all' ? 'secondary' : 'outline'}
              onClick={() => setCategory('all')}
              aria-pressed={category === 'all'}
            >
              {t('allCategories')}
            </Button>
            {menu.categories.map((entry) => (
              <Button
                key={entry.id}
                size="sm"
                variant={category === entry.id ? 'secondary' : 'outline'}
                onClick={() => setCategory(entry.id)}
                aria-pressed={category === entry.id}
              >
                {label(entry.name)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {items.length} {t('itemCount')}
          </span>
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {menu.modifierGroups.length} {t('modifierGroups')}
          </span>
        </div>

        {items.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const available = item.available
              return (
                <Card
                  key={item.id}
                  className={!available ? 'opacity-70' : undefined}
                >
                  <CardContent className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{label(item.name)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.sku} ·{' '}
                          {label(categoryNames.get(item.categoryId)!)}
                        </p>
                      </div>
                      <Badge variant={available ? 'success' : 'warning'}>
                        {available ? t('available') : t('unavailable')}
                      </Badge>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3">
                      <div>
                        <p className="font-mono text-lg font-semibold">
                          {formatMoney(item.price.minor / 100)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.modifierGroupIds.length} {t('modifierGroups')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={available ? 'outline' : 'default'}
                        onClick={() =>
                          setMenu((current) =>
                            setMenuItemAvailability(
                              current,
                              item.id,
                              !available,
                            ),
                          )
                        }
                        aria-label={`${available ? t('markUnavailable') : t('markAvailable')}: ${label(item.name)}`}
                      >
                        {available ? (
                          <X aria-hidden="true" />
                        ) : (
                          <Check aria-hidden="true" />
                        )}
                        {available ? t('markUnavailable') : t('markAvailable')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              {t('noMenuResults')}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
