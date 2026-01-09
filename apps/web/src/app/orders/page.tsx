'use client'

import { Minus, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  addDraftOrderLine,
  calculateDraftOrderTotal,
  money,
  setDraftOrderLineQuantity,
  type DraftOrder,
} from '@cafepos/domain'

import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ORDER_STORAGE_KEY,
  parseStoredOrder,
  serializeOrder,
} from '@/lib/order-storage'

const vat = {
  id: 'vat7',
  name: 'VAT 7%',
  basisPoints: 700,
  mode: 'inclusive' as const,
}
const products = [
  {
    id: 'espresso',
    en: 'Espresso',
    th: 'เอสเปรสโซ',
    category: 'coffee',
    price: 8000,
  },
  {
    id: 'latte',
    en: 'Café latte',
    th: 'คาเฟ่ลาเต้',
    category: 'coffee',
    price: 12000,
  },
  {
    id: 'cold-brew',
    en: 'Cold brew',
    th: 'โคลด์บรูว์',
    category: 'coffee',
    price: 13500,
  },
  {
    id: 'thai-tea',
    en: 'Thai milk tea',
    th: 'ชาไทย',
    category: 'tea',
    price: 9500,
  },
  {
    id: 'matcha',
    en: 'Matcha latte',
    th: 'มัทฉะลาเต้',
    category: 'tea',
    price: 13000,
  },
  {
    id: 'croissant',
    en: 'Butter croissant',
    th: 'ครัวซองต์เนย',
    category: 'bakery',
    price: 9000,
  },
] as const

const emptyOrder = (): DraftOrder => ({
  id: `draft-${Date.now()}`,
  currency: 'THB',
  lines: [],
})

export default function OrdersPage() {
  const { locale, money: formatMoney, t } = useLocale()
  const [order, setOrder] = useState<DraftOrder>(emptyOrder)
  const [storageReady, setStorageReady] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const label = (product: (typeof products)[number]) =>
    locale === 'th' ? product.th : product.en
  const shown = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    return products.filter(
      (product) =>
        (category === 'all' || product.category === category) &&
        (!normalized ||
          `${product.en} ${product.th}`
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    )
  }, [category, locale, query])
  const total = calculateDraftOrderTotal(order)

  useEffect(() => {
    const fallback = emptyOrder()
    try {
      setOrder(
        parseStoredOrder(localStorage.getItem(ORDER_STORAGE_KEY), fallback),
      )
    } catch {
      setOrder(fallback)
    }
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady) return
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, serializeOrder(order))
    } catch {
      // Ordering remains usable when browser storage is unavailable.
    }
  }, [order, storageReady])

  const add = (product: (typeof products)[number]) => {
    const existing = order.lines.find((line) => line.itemId === product.id)
    if (existing) {
      setOrder(
        setDraftOrderLineQuantity(order, existing.id, existing.quantity + 1),
      )
      return
    }
    setOrder(
      addDraftOrderLine(order, {
        id: `${product.id}-${Date.now()}`,
        itemId: product.id,
        name: product.en,
        quantity: 1,
        unitPrice: money(product.price),
        modifiers: [],
        taxRate: vat,
      }),
    )
  }

  return (
    <AppShell>
      <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="p-4 md:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight">
              {t('newOrder')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('counterOrderDescription')}
            </p>
          </div>
          <label className="relative block max-w-md">
            <span className="sr-only">{t('searchMenu')}</span>
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchMenu')}
              className="h-11 w-full rounded-md border bg-background ps-10 pe-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="my-4 flex gap-2 overflow-x-auto pb-1">
            {(['all', 'coffee', 'tea', 'bakery'] as const).map((entry) => (
              <Button
                key={entry}
                size="sm"
                variant={category === entry ? 'secondary' : 'outline'}
                aria-pressed={category === entry}
                onClick={() => setCategory(entry)}
              >
                {t(entry === 'all' ? 'allCategories' : entry)}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((product) => (
              <button
                key={product.id}
                onClick={() => add(product)}
                className="rounded-xl border bg-card p-5 text-start shadow-sm transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge variant="secondary">{t(product.category)}</Badge>
                <span className="mt-8 block text-lg font-semibold">
                  {label(product)}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {formatMoney(product.price)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside
          className="border-t bg-muted/30 p-4 lg:border-s lg:border-t-0 lg:p-6"
          aria-label={t('currentOrder')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{t('currentOrder')}</h2>
              <p className="text-sm text-muted-foreground">
                {order.lines.length} {t('itemCount')}
              </p>
            </div>
            <ShoppingBag
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="my-5 grid gap-3">
            {order.lines.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {t('emptyOrder')}
                </CardContent>
              </Card>
            ) : (
              order.lines.map((line) => (
                <Card key={line.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{line.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(line.unitPrice.minor)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`${t('decrease')} ${line.name}`}
                        onClick={() =>
                          setOrder(
                            setDraftOrderLineQuantity(
                              order,
                              line.id,
                              line.quantity - 1,
                            ),
                          )
                        }
                      >
                        {line.quantity === 1 ? (
                          <Trash2 aria-hidden="true" />
                        ) : (
                          <Minus aria-hidden="true" />
                        )}
                      </Button>
                      <span className="w-7 text-center font-medium">
                        {line.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`${t('increase')} ${line.name}`}
                        onClick={() =>
                          setOrder(
                            setDraftOrderLineQuantity(
                              order,
                              line.id,
                              line.quantity + 1,
                            ),
                          )
                        }
                      >
                        <Plus aria-hidden="true" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <div className="mt-auto border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span>{t('subtotal')}</span>
              <span>{formatMoney(total.net.minor)}</span>
            </div>
            <div className="mt-2 flex justify-between text-muted-foreground">
              <span>{t('tax')}</span>
              <span>{formatMoney(total.tax.minor)}</span>
            </div>
            <div className="mt-4 flex justify-between text-lg font-semibold">
              <span>{t('total')}</span>
              <span>{formatMoney(total.gross.minor)}</span>
            </div>
            <Button
              className="mt-5 w-full"
              size="lg"
              disabled={order.lines.length === 0}
            >
              {t('reviewOrder')}
            </Button>
            {order.lines.length > 0 && (
              <Button
                className="mt-2 w-full"
                variant="ghost"
                onClick={() => setOrder(emptyOrder())}
              >
                {t('clearOrder')}
              </Button>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
