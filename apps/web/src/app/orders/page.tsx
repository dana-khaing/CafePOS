'use client'

import { Minus, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  addDraftOrderLine,
  calculateDraftOrderTotal,
  money,
  orderLineModifierSignature,
  setDraftOrderDiningMode,
  setDraftOrderLineQuantity,
  submitDraftOrder,
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
import { enqueueSubmittedOrder } from '@/lib/order-submission'

const vat = {
  id: 'vat7',
  name: 'VAT 7%',
  basisPoints: 700,
  mode: 'inclusive' as const,
}
type Product = Readonly<{
  id: string
  en: string
  th: string
  category: 'coffee' | 'tea' | 'bakery'
  price: number
  modifiers: readonly ('size' | 'milk')[]
}>

const products = [
  {
    id: 'espresso',
    en: 'Espresso',
    th: 'เอสเปรสโซ',
    category: 'coffee',
    price: 8000,
    modifiers: ['size'],
  },
  {
    id: 'latte',
    en: 'Café latte',
    th: 'คาเฟ่ลาเต้',
    category: 'coffee',
    price: 12000,
    modifiers: ['size', 'milk'],
  },
  {
    id: 'cold-brew',
    en: 'Cold brew',
    th: 'โคลด์บรูว์',
    category: 'coffee',
    price: 13500,
    modifiers: ['size'],
  },
  {
    id: 'thai-tea',
    en: 'Thai milk tea',
    th: 'ชาไทย',
    category: 'tea',
    price: 9500,
    modifiers: ['size', 'milk'],
  },
  {
    id: 'matcha',
    en: 'Matcha latte',
    th: 'มัทฉะลาเต้',
    category: 'tea',
    price: 13000,
    modifiers: ['size', 'milk'],
  },
  {
    id: 'croissant',
    en: 'Butter croissant',
    th: 'ครัวซองต์เนย',
    category: 'bakery',
    price: 9000,
    modifiers: [],
  },
] as const satisfies readonly Product[]

const emptyOrder = (): DraftOrder => ({
  id: `draft-${Date.now()}`,
  currency: 'THB',
  diningMode: 'counter',
  lines: [],
})

export default function OrdersPage() {
  const { locale, money: formatMoney, t } = useLocale()
  const [order, setOrder] = useState<DraftOrder>(emptyOrder)
  const [storageReady, setStorageReady] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [choices, setChoices] = useState<Record<string, string[]>>({})
  const [submission, setSubmission] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle')
  const label = (product: Product) =>
    locale === 'th' ? product.th : product.en
  const shown = useMemo<readonly Product[]>(() => {
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

  const add = (product: Product) => {
    const selected = choices[product.id] ?? []
    const modifiers = selected.map((optionId) =>
      optionId === 'large'
        ? { optionId, name: t('large'), priceDelta: money(2500) }
        : { optionId, name: t('oatMilk'), priceDelta: money(2000) },
    )
    const signature = orderLineModifierSignature(modifiers)
    const existing = order.lines.find(
      (line) =>
        line.itemId === product.id &&
        orderLineModifierSignature(line.modifiers) === signature,
    )
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
        name: label(product),
        quantity: 1,
        unitPrice: money(product.price),
        modifiers,
        taxRate: vat,
      }),
    )
  }

  const toggleChoice = (productId: string, optionId: string) => {
    setChoices((current) => {
      const selected = current[productId] ?? []
      return {
        ...current,
        [productId]: selected.includes(optionId)
          ? selected.filter((entry) => entry !== optionId)
          : [...selected, optionId],
      }
    })
  }

  const submit = async () => {
    setSubmission('sending')
    try {
      const now = new Date().toISOString()
      const result = submitDraftOrder(order, {
        branchId: 'branch-riverside',
        actorId: 'cashier-local',
        submittedAt: now,
        eventId: crypto.randomUUID(),
      })
      await enqueueSubmittedOrder(result.event)
      setOrder(emptyOrder())
      setChoices({})
      setSubmission('sent')
    } catch {
      setSubmission('error')
    }
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
          <div
            className="mt-4 flex flex-wrap items-center gap-2"
            aria-label={t('diningMode')}
          >
            {(['counter', 'takeaway', 'table'] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={order.diningMode === mode ? 'secondary' : 'outline'}
                aria-pressed={order.diningMode === mode}
                onClick={() =>
                  setOrder(
                    setDraftOrderDiningMode(
                      order,
                      mode,
                      mode === 'table' ? (order.tableNumber ?? '1') : undefined,
                    ),
                  )
                }
              >
                {t(mode)}
              </Button>
            ))}
            {order.diningMode === 'table' && (
              <label className="flex items-center gap-2 text-sm">
                <span>{t('tableNumber')}</span>
                <input
                  className="h-9 w-20 rounded-md border bg-background px-2"
                  value={order.tableNumber}
                  onChange={(event) => {
                    if (event.target.value.trim())
                      setOrder(
                        setDraftOrderDiningMode(
                          order,
                          'table',
                          event.target.value,
                        ),
                      )
                  }}
                />
              </label>
            )}
          </div>
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
              <article
                key={product.id}
                className="rounded-xl border bg-card p-5 text-start shadow-sm"
              >
                <Badge variant="secondary">{t(product.category)}</Badge>
                <h2 className="mt-8 text-lg font-semibold">{label(product)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatMoney(product.price)}
                </p>
                {product.modifiers.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.modifiers.includes('size') && (
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          (choices[product.id] ?? []).includes('large')
                            ? 'secondary'
                            : 'outline'
                        }
                        aria-pressed={(choices[product.id] ?? []).includes(
                          'large',
                        )}
                        onClick={() => toggleChoice(product.id, 'large')}
                      >
                        {t('large')} +{formatMoney(2500)}
                      </Button>
                    )}
                    {product.modifiers.includes('milk') && (
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          (choices[product.id] ?? []).includes('oat')
                            ? 'secondary'
                            : 'outline'
                        }
                        aria-pressed={(choices[product.id] ?? []).includes(
                          'oat',
                        )}
                        onClick={() => toggleChoice(product.id, 'oat')}
                      >
                        {t('oatMilk')} +{formatMoney(2000)}
                      </Button>
                    )}
                  </div>
                )}
                <Button className="mt-4 w-full" onClick={() => add(product)}>
                  {t('addToOrder')}
                </Button>
              </article>
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
                      {line.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {line.modifiers
                            .map((modifier) => modifier.name)
                            .join(', ')}
                        </p>
                      )}
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
            {submission === 'sent' && (
              <p
                role="status"
                className="mb-3 rounded-md bg-primary/10 p-3 text-primary"
              >
                {t('orderQueued')}
              </p>
            )}
            {submission === 'error' && (
              <p
                role="alert"
                className="mb-3 rounded-md bg-destructive/10 p-3 text-destructive"
              >
                {t('orderSubmitError')}
              </p>
            )}
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
              onClick={submit}
            >
              {submission === 'sending'
                ? t('submittingOrder')
                : t('submitOrder')}
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
