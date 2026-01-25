'use client'

import { Check, PencilLine, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { money, type Menu } from '@cafepos/domain'

import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  parseMinorUnits,
  removeMenuCategory,
  removeMenuItem,
  saveMenuCategory,
  saveMenuItem,
  setMenuItemVisibility,
} from '@/lib/menu-admin'
import {
  defaultMenu,
  MENU_STORAGE_KEY,
  parseStoredMenu,
  serializeMenu,
} from '@/lib/menu-storage'
import { withCriticalStorageLock } from '@/lib/storage-lock'

type CategoryDraft = Readonly<{
  id: string
  en: string
  th: string
  sortOrder: string
}>

type ItemDraft = Readonly<{
  id: string
  categoryId: string
  sku: string
  en: string
  th: string
  price: string
  taxRateId: string
  available: boolean
  modifierGroupIds: string[]
}>

type Notice = Readonly<{
  kind: 'idle' | 'saved' | 'error'
  message: string
}>

const emptyCategoryDraft = (): CategoryDraft => ({
  id: '',
  en: '',
  th: '',
  sortOrder: '0',
})

const emptyItemDraft = (categoryId = ''): ItemDraft => ({
  id: '',
  categoryId,
  sku: '',
  en: '',
  th: '',
  price: '0',
  taxRateId: 'vat7',
  available: true,
  modifierGroupIds: [],
})

export default function MenuPage() {
  const { locale, money: formatMoney, t } = useLocale()
  const [menu, setMenu] = useState<Menu>(defaultMenu())
  const [storageReady, setStorageReady] = useState(false)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(
    emptyCategoryDraft(),
  )
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  )
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyItemDraft())
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>({
    kind: 'idle',
    message: '',
  })

  useEffect(() => {
    try {
      setMenu(
        parseStoredMenu(
          window.localStorage.getItem(MENU_STORAGE_KEY),
          defaultMenu(),
        ),
      )
    } catch {
      setMenu(defaultMenu())
      setNotice({
        kind: 'error',
        message: 'Menu data was reset to the default catalog.',
      })
    }
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady) return
    void withCriticalStorageLock(() =>
      window.localStorage.setItem(MENU_STORAGE_KEY, serializeMenu(menu)),
    ).catch(() => {
      setNotice({
        kind: 'error',
        message: 'Menu changes could not be saved locally.',
      })
    })
  }, [menu, storageReady])

  const label = (text: { en: string; th?: string }) =>
    locale === 'th' && text.th ? text.th : text.en

  const sortedCategories = useMemo(
    () => [...menu.categories].sort((left, right) => left.sortOrder - right.sortOrder),
    [menu.categories],
  )

  const categoryNames = useMemo(
    () => new Map(sortedCategories.map((entry) => [entry.id, entry.name])),
    [sortedCategories],
  )

  const filteredItems = useMemo(() => {
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

  const clearCategoryDraft = () => {
    setCategoryDraft(emptyCategoryDraft())
    setEditingCategoryId(null)
  }

  const clearItemDraft = () => {
    setItemDraft(emptyItemDraft(sortedCategories[0]?.id ?? ''))
    setEditingItemId(null)
  }

  useEffect(() => {
    if (!itemDraft.categoryId && sortedCategories[0]) {
      setItemDraft((current) => ({
        ...current,
        categoryId: sortedCategories[0]!.id,
      }))
    }
  }, [itemDraft.categoryId, sortedCategories])

  const saveCategory = () => {
    try {
      const next = saveMenuCategory(menu, {
        id: categoryDraft.id.trim(),
        name: {
          en: categoryDraft.en.trim(),
          th: categoryDraft.th.trim() || undefined,
        },
        sortOrder: parseMinorUnits(categoryDraft.sortOrder, 'Sort order'),
      })
      setMenu(next)
      clearCategoryDraft()
      setNotice({ kind: 'saved', message: 'Category saved.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Could not save category.',
      })
    }
  }

  const editCategory = (id: string) => {
    const current = menu.categories.find((entry) => entry.id === id)
    if (!current) return
    setCategoryDraft({
      id: current.id,
      en: current.name.en,
      th: current.name.th ?? '',
      sortOrder: String(current.sortOrder),
    })
    setEditingCategoryId(current.id)
  }

  const deleteCategory = (id: string) => {
    try {
      setMenu((current) => removeMenuCategory(current, id))
      if (editingCategoryId === id) clearCategoryDraft()
      setNotice({ kind: 'saved', message: 'Category removed.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Could not remove category.',
      })
    }
  }

  const saveItem = () => {
    try {
      if (!itemDraft.categoryId) {
        throw new TypeError('Choose a category first.')
      }
      const next = saveMenuItem(menu, {
        id: itemDraft.id.trim(),
        categoryId: itemDraft.categoryId,
        sku: itemDraft.sku.trim(),
        name: {
          en: itemDraft.en.trim(),
          th: itemDraft.th.trim() || undefined,
        },
        price: money(parseMinorUnits(itemDraft.price, 'Price')),
        taxRateId: itemDraft.taxRateId.trim(),
        available: itemDraft.available,
        modifierGroupIds: itemDraft.modifierGroupIds,
      })
      setMenu(next)
      clearItemDraft()
      setNotice({ kind: 'saved', message: 'Menu item saved.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Could not save menu item.',
      })
    }
  }

  const editItem = (id: string) => {
    const current = menu.items.find((entry) => entry.id === id)
    if (!current) return
    setItemDraft({
      id: current.id,
      categoryId: current.categoryId,
      sku: current.sku,
      en: current.name.en,
      th: current.name.th ?? '',
      price: String(current.price.minor),
      taxRateId: current.taxRateId,
      available: current.available,
      modifierGroupIds: [...current.modifierGroupIds],
    })
    setEditingItemId(current.id)
  }

  const deleteItem = (id: string) => {
    try {
      setMenu((current) => removeMenuItem(current, id))
      if (editingItemId === id) clearItemDraft()
      setNotice({ kind: 'saved', message: 'Menu item removed.' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Could not remove item.',
      })
    }
  }

  const toggleItemAvailability = (id: string, available: boolean) => {
    try {
      setMenu((current) => setMenuItemVisibility(current, id, available))
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Could not change availability.',
      })
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('menuTitle')}
          </h1>
          <p className="mt-2 text-muted-foreground">{t('menuDescription')}</p>
        </div>

        {notice.kind !== 'idle' && notice.message && (
          <p
            role="status"
            className={`rounded-md p-3 text-sm ${
              notice.kind === 'saved'
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {notice.message}
          </p>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Category editor</h2>
                  <p className="text-sm text-muted-foreground">
                    Add or update the groups used by the menu grid.
                  </p>
                </div>
                <Button variant="outline" onClick={clearCategoryDraft}>
                  New category
                </Button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Category id
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={categoryDraft.id}
                    disabled={editingCategoryId !== null}
                    onChange={(event) =>
                      setCategoryDraft((current) => ({
                        ...current,
                        id: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Sort order
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    inputMode="numeric"
                    value={categoryDraft.sortOrder}
                    onChange={(event) =>
                      setCategoryDraft((current) => ({
                        ...current,
                        sortOrder: event.target.value.replace(/\D/g, ''),
                      }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  English name
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={categoryDraft.en}
                    onChange={(event) =>
                      setCategoryDraft((current) => ({
                        ...current,
                        en: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Thai name
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={categoryDraft.th}
                    onChange={(event) =>
                      setCategoryDraft((current) => ({
                        ...current,
                        th: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <Button className="mt-4" onClick={saveCategory}>
                {editingCategoryId ? 'Update category' : 'Save category'}
              </Button>
              <div className="mt-6 flex flex-wrap gap-2">
                {sortedCategories.map((entry) => (
                  <span
                    key={entry.id}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                  >
                    {label(entry.name)}
                    <span className="text-xs text-muted-foreground">
                      #{entry.sortOrder}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => editCategory(entry.id)}
                    >
                      <PencilLine className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteCategory(entry.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Menu item editor</h2>
                  <p className="text-sm text-muted-foreground">
                    Create products and assign existing modifier groups.
                  </p>
                </div>
                <Button variant="outline" onClick={clearItemDraft}>
                  New item
                </Button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Item id
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={itemDraft.id}
                    disabled={editingItemId !== null}
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        id: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  SKU
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={itemDraft.sku}
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Category
                  <select
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={itemDraft.categoryId}
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose a category</option>
                    {sortedCategories.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {label(entry.name)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Price
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    inputMode="numeric"
                    value={itemDraft.price}
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        price: event.target.value.replace(/\D/g, ''),
                      }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  English name
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={itemDraft.en}
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        en: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Thai name
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={itemDraft.th}
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        th: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Tax rate id
                  <input
                    className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                    value={itemDraft.taxRateId}
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        taxRateId: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={itemDraft.available}
                    onChange={(event) =>
                      setItemDraft((current) => ({
                        ...current,
                        available: event.target.checked,
                      }))
                    }
                  />
                  Available for sale
                </label>
              </div>

              <div className="mt-5">
                <p className="text-sm font-medium">Modifier groups</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {menu.modifierGroups.map((group) => (
                    <label
                      key={group.id}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={itemDraft.modifierGroupIds.includes(group.id)}
                        onChange={(event) =>
                          setItemDraft((current) => {
                            const groups = event.target.checked
                              ? [...current.modifierGroupIds, group.id]
                              : current.modifierGroupIds.filter(
                                  (entry) => entry !== group.id,
                                )
                            return { ...current, modifierGroupIds: groups }
                          })
                        }
                      />
                      {label(group.name)}
                    </label>
                  ))}
                </div>
              </div>

              <Button className="mt-4" onClick={saveItem}>
                {editingItemId ? 'Update item' : 'Save item'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Catalog preview</h2>
                <p className="text-sm text-muted-foreground">
                  Current menu items and modifier groups loaded by the order
                  screen.
                </p>
              </div>
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
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={category === 'all' ? 'secondary' : 'outline'}
                onClick={() => setCategory('all')}
                aria-pressed={category === 'all'}
              >
                {t('allCategories')}
              </Button>
              {sortedCategories.map((entry) => (
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

            <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {filteredItems.length} {t('itemCount')}
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4" aria-hidden="true" />
                {menu.modifierGroups.length} {t('modifierGroups')}
              </span>
            </div>

            {filteredItems.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => {
                  const available = item.available
                  const categoryName = categoryNames.get(item.categoryId)
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
                              {item.sku} · {categoryName ? label(categoryName) : ''}
                            </p>
                          </div>
                          <Badge variant={available ? 'success' : 'warning'}>
                            {available ? t('available') : t('unavailable')}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {item.modifierGroupIds.map((groupId) => {
                            const group = menu.modifierGroups.find(
                              (entry) => entry.id === groupId,
                            )
                            if (!group) return null
                            return (
                              <span
                                key={groupId}
                                className="rounded-full border px-2 py-1"
                              >
                                {label(group.name)}
                              </span>
                            )
                          })}
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-3">
                          <div>
                            <p className="font-mono text-lg font-semibold">
                              {formatMoney(item.price.minor)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.modifierGroupIds.length} {t('modifierGroups')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editItem(item.id)}
                            >
                              <PencilLine aria-hidden="true" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={available ? 'outline' : 'default'}
                              onClick={() =>
                                toggleItemAvailability(item.id, !available)
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="mt-4">
                <CardContent className="p-10 text-center text-muted-foreground">
                  {t('noMenuResults')}
                </CardContent>
              </Card>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold">Modifier groups in use</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {menu.modifierGroups.map((group) => (
                  <Card key={group.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{label(group.name)}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.minimum} - {group.maximum} selections
                          </p>
                        </div>
                        <Badge variant="secondary">{group.id}</Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {group.options.map((option) => (
                          <span
                            key={option.id}
                            className="rounded-full border px-3 py-1 text-sm"
                          >
                            {label(option.name)}
                            {' +'}
                            {formatMoney(option.priceDelta.minor)}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
