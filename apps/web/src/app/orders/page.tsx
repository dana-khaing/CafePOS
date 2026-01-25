'use client'

import { Minus, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  addDraftOrderLine,
  calculateDraftOrderTotal,
  createPaymentSession,
  createReceipt,
  orderLineModifierSignature,
  setDraftOrderDiningMode,
  setDraftOrderLineQuantity,
  submitDraftOrder,
  validateSubmittedOrderEvent,
  type DraftOrder,
  type Menu,
  type MenuItem,
  type ModifierGroup,
  type PaymentSession,
  type Receipt,
} from '@cafepos/domain'

import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { PaymentDialog } from '@/components/payment-dialog'
import { ReceiptDialog } from '@/components/receipt-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ORDER_STORAGE_KEY,
  parseStoredOrder,
  serializeOrder,
} from '@/lib/order-storage'
import {
  PENDING_ORDER_SUBMISSION_KEY,
  enqueueSubmittedOrder,
  parsePendingOrderSubmission,
  serializePendingOrderSubmission,
} from '@/lib/order-submission'
import {
  PAYMENT_STORAGE_KEY,
  parseStoredPayment,
  serializePayment,
} from '@/lib/payment-storage'
import {
  RECEIPT_STORAGE_KEY,
  parseStoredReceipt,
  serializeReceipt,
} from '@/lib/receipt-storage'
import {
  HISTORY_STORAGE_KEY,
  appendReceipt,
  parseSaleHistory,
  serializeSaleHistory,
} from '@/lib/history-storage'
import { defaultMenu, MENU_STORAGE_KEY, parseStoredMenu } from '@/lib/menu-storage'
import { recordCashSale, updateStoredShiftLedger } from '@/lib/shift-storage'
import {
  consumePendingInventory,
  stageInventoryReceipt,
} from '@/lib/inventory-storage'
import { withCriticalStorageLock } from '@/lib/storage-lock'

const vat = {
  id: 'vat7',
  name: 'VAT 7%',
  basisPoints: 700,
  mode: 'inclusive' as const,
}
type Product = Readonly<{
  item: MenuItem
  categoryName: Readonly<{ en: string; th?: string }>
  modifierGroups: readonly ModifierGroup[]
}>

const emptyOrder = (): DraftOrder => ({
  id: `draft-${Date.now()}`,
  currency: 'THB',
  diningMode: 'counter',
  lines: [],
})

type ModifierSelections = Record<string, Record<string, readonly string[]>>

export default function OrdersPage() {
  const { locale, money: formatMoney, t } = useLocale()
  const [order, setOrder] = useState<DraftOrder>(emptyOrder)
  const [storageReady, setStorageReady] = useState(false)
  const [menu, setMenu] = useState<Menu>(defaultMenu())
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [choices, setChoices] = useState<ModifierSelections>({})
  const [submission, setSubmission] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle')
  const [payment, setPayment] = useState<PaymentSession | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const submittingRef = useRef(false)
  const pendingEventRef =
    useRef<ReturnType<typeof parsePendingOrderSubmission>>(null)
  const categoryById = useMemo(
    () => new Map(menu.categories.map((entry) => [entry.id, entry])),
    [menu.categories],
  )
  const modifierGroupById = useMemo(
    () => new Map(menu.modifierGroups.map((entry) => [entry.id, entry])),
    [menu.modifierGroups],
  )
  const sortedCategories = useMemo(
    () => [...menu.categories].sort((left, right) => left.sortOrder - right.sortOrder),
    [menu.categories],
  )
  const visibleItems = useMemo<readonly Product[]>(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    return menu.items
      .filter((item) => category === 'all' || item.categoryId === category)
      .filter((item) => {
        if (!normalized) return true
        return `${item.name.en} ${item.name.th ?? ''} ${item.sku}`
          .toLocaleLowerCase(locale)
          .includes(normalized)
      })
      .map((item) => ({
        item,
        categoryName:
          categoryById.get(item.categoryId)?.name ??
          ({ en: item.categoryId } as const),
        modifierGroups: item.modifierGroupIds
          .map((groupId) => modifierGroupById.get(groupId))
          .filter((group): group is ModifierGroup => Boolean(group)),
      }))
  }, [category, categoryById, locale, menu.items, modifierGroupById, query])
  const label = (text: { en: string; th?: string }) =>
    locale === 'th' && text.th ? text.th : text.en
  const total = calculateDraftOrderTotal(order)

  useEffect(() => {
    const fallback = emptyOrder()
    try {
      const restored = parseStoredOrder(
        localStorage.getItem(ORDER_STORAGE_KEY),
        fallback,
      )
      setOrder(restored)
      const pending = parsePendingOrderSubmission(
        localStorage.getItem(PENDING_ORDER_SUBMISSION_KEY),
      )
      if (pending?.entityId === restored.id) {
        pendingEventRef.current = pending
        setSubmission('error')
      }
      setPayment(parseStoredPayment(localStorage.getItem(PAYMENT_STORAGE_KEY)))
      setReceipt(parseStoredReceipt(localStorage.getItem(RECEIPT_STORAGE_KEY)))
    } catch {
      setOrder(fallback)
    }
    setStorageReady(true)
  }, [])

  useEffect(() => {
    const loadMenu = () => {
      try {
        setMenu(
          parseStoredMenu(
            localStorage.getItem(MENU_STORAGE_KEY),
            defaultMenu(),
          ),
        )
      } catch {
        setMenu(defaultMenu())
      }
    }
    loadMenu()
    window.addEventListener('storage', loadMenu)
    return () => window.removeEventListener('storage', loadMenu)
  }, [])

  useEffect(() => {
    if (!storageReady) return
    void withCriticalStorageLock(() =>
      localStorage.setItem(ORDER_STORAGE_KEY, serializeOrder(order)),
    ).catch(() => {
      // Ordering remains usable when browser storage is unavailable.
    })
  }, [order, storageReady])

  const toggleChoice = (
    itemId: string,
    group: ModifierGroup,
    optionId: string,
  ) => {
    setChoices((current) => {
      const currentGroup = current[itemId]?.[group.id] ?? []
      const nextGroup =
        group.maximum === 1
          ? currentGroup.includes(optionId)
            ? []
            : [optionId]
          : currentGroup.includes(optionId)
            ? currentGroup.filter((entry) => entry !== optionId)
            : [...currentGroup, optionId]
      return {
        ...current,
        [itemId]: {
          ...(current[itemId] ?? {}),
          [group.id]: nextGroup,
        },
      }
    })
  }

  const buildModifiers = (item: MenuItem) =>
    item.modifierGroupIds.flatMap((groupId) => {
      const group = modifierGroupById.get(groupId)
      if (!group) return []
      const selected = choices[item.id]?.[groupId] ?? []
      const required = selected.length
        ? selected
        : group.minimum > 0
          ? group.options
              .filter((option) => option.available)
              .slice(0, group.minimum)
              .map((option) => option.id)
          : []
      return required.flatMap((optionId) => {
        const option = group.options.find((entry) => entry.id === optionId)
        if (!option) return []
        return [
          {
            optionId: option.id,
            name: label(option.name),
            priceDelta: option.priceDelta,
          },
        ]
      })
    })

  const add = (product: Product) => {
    const modifiers = buildModifiers(product.item)
    const signature = orderLineModifierSignature(modifiers)
    const existing = order.lines.find(
      (line) =>
        line.itemId === product.item.id &&
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
        id: `${product.item.id}-${Date.now()}`,
        itemId: product.item.id,
        name: label(product.item.name),
        quantity: 1,
        unitPrice: product.item.price,
        modifiers,
        taxRate: vat,
      }),
    )
  }

  const submit = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmission('sending')
    try {
      const event =
        pendingEventRef.current ??
        submitDraftOrder(order, {
          branchId: 'branch-riverside',
          actorId: 'cashier-local',
          submittedAt: new Date().toISOString(),
          eventId: `order:${order.id}:v1`,
        }).event
      await withCriticalStorageLock(() =>
        localStorage.setItem(
          PENDING_ORDER_SUBMISSION_KEY,
          serializePendingOrderSubmission(event),
        ),
      )
      pendingEventRef.current = event
      await enqueueSubmittedOrder(event)
      pendingEventRef.current = null
      await withCriticalStorageLock(() =>
        localStorage.removeItem(PENDING_ORDER_SUBMISSION_KEY),
      )
      const submitted = validateSubmittedOrderEvent(event)
      const nextPayment = createPaymentSession(
        `payment-${submitted.id}`,
        submitted.id,
        submitted.totals.gross,
      )
      await withCriticalStorageLock(() =>
        localStorage.setItem(
          PAYMENT_STORAGE_KEY,
          serializePayment(nextPayment),
        ),
      )
      setPayment(nextPayment)
      setSubmission('sent')
    } catch {
      setSubmission('error')
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <AppShell>
      {payment && (
        <PaymentDialog
          initial={payment}
          onComplete={async (completedPayment) => {
            const completedReceipt = createReceipt(order, completedPayment)
            await stageInventoryReceipt(localStorage, completedReceipt)
            await updateStoredShiftLedger(localStorage, (ledger) =>
              recordCashSale(ledger, completedReceipt),
            )
            try {
              await consumePendingInventory(localStorage)
            } catch {
              // The durable projection queue remains available for retry.
            }
            await withCriticalStorageLock(() => {
              localStorage.setItem(
                RECEIPT_STORAGE_KEY,
                serializeReceipt(completedReceipt),
              )
              localStorage.setItem(
                HISTORY_STORAGE_KEY,
                serializeSaleHistory(
                  appendReceipt(
                    parseSaleHistory(localStorage.getItem(HISTORY_STORAGE_KEY)),
                    completedReceipt,
                  ),
                ),
              )
            })
            setReceipt(completedReceipt)
            setPayment(null)
            setOrder(emptyOrder())
            setChoices({})
            setSubmission('idle')
          }}
        />
      )}
      {receipt && (
        <ReceiptDialog
          receipt={receipt}
          onDone={async () => {
            try {
              await withCriticalStorageLock(() =>
                localStorage.removeItem(RECEIPT_STORAGE_KEY),
              )
              setReceipt(null)
            } catch {
              setSubmission('error')
            }
          }}
        />
      )}
      {submission === 'error' && (
        <div
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card p-4 shadow-xl"
          role="alert"
        >
          <p className="flex-1 text-sm">{t('orderSubmitError')}</p>
          <Button onClick={submit}>{t('retrySubmission')}</Button>
        </div>
      )}
      <fieldset
        disabled={
          submission === 'sending' || submission === 'error' || Boolean(payment)
        }
        className="contents"
      >
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
                        mode === 'table'
                          ? (order.tableNumber ?? '1')
                          : undefined,
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
              <Button
                size="sm"
                variant={category === 'all' ? 'secondary' : 'outline'}
                aria-pressed={category === 'all'}
                onClick={() => setCategory('all')}
              >
                {t('allCategories')}
              </Button>
              {sortedCategories.map((entry) => (
                <Button
                  key={entry.id}
                  size="sm"
                  variant={category === entry.id ? 'secondary' : 'outline'}
                  aria-pressed={category === entry.id}
                  onClick={() => setCategory(entry.id)}
                >
                  {label(entry.name)}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((product) => (
                <article
                  key={product.item.id}
                  className="flex h-full flex-col rounded-xl border bg-card p-5 text-start shadow-sm"
                >
                  <Badge variant="secondary">
                    {label(product.categoryName)}
                  </Badge>
                  <h2 className="mt-8 text-lg font-semibold">
                    {label(product.item.name)}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMoney(product.item.price.minor)}
                  </p>
                  {!product.item.available && (
                    <Badge className="mt-3 w-fit" variant="warning">
                      Unavailable
                    </Badge>
                  )}
                  {product.modifierGroups.length > 0 && (
                    <div className="mt-4 flex flex-col gap-3">
                      {product.modifierGroups.map((group) => {
                        const selected = choices[product.item.id]?.[group.id] ?? []
                        return (
                          <div key={group.id}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">
                                {label(group.name)}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {group.minimum > 0 ? 'Required' : 'Optional'}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {group.options.map((option) => (
                                <Button
                                  key={option.id}
                                  type="button"
                                  size="sm"
                                  variant={
                                    selected.includes(option.id)
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                  aria-pressed={selected.includes(option.id)}
                                  disabled={!option.available}
                                  onClick={() =>
                                    toggleChoice(product.item.id, group, option.id)
                                  }
                                >
                                  {label(option.name)} +{formatMoney(option.priceDelta.minor)}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <Button
                    className="mt-auto w-full"
                    onClick={() => add(product)}
                    disabled={!product.item.available}
                  >
                    {product.item.available ? t('addToOrder') : 'Unavailable'}
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
      </fieldset>
    </AppShell>
  )
}
