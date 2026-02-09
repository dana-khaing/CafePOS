'use client'

import { AlertTriangle, PackageOpen, PencilLine } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { adjustStock, type Inventory, type StockItem } from '@cafepos/domain'

import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { verifyManagerPin } from '@/lib/manager-client'
import { saveStockItem } from '@/lib/inventory-admin'
import {
  defaultMenu,
  MENU_STORAGE_KEY,
  parseStoredMenu,
} from '@/lib/menu-storage'
import {
  INVENTORY_STORAGE_KEY,
  consumePendingInventory,
  initialInventory,
  parseInventory,
  updateStoredInventory,
} from '@/lib/inventory-storage'
import { getMenuItemsAtRisk } from '@/lib/stock-availability'

type StockDraft = Readonly<{
  id: string
  name: string
  unit: StockItem['unit']
  quantity: string
  reorderAt: string
}>

type Notice = Readonly<{
  kind: 'idle' | 'saved' | 'error'
  message: string
}>

const emptyDraft = (): StockDraft => ({
  id: '',
  name: '',
  unit: 'g',
  quantity: '0',
  reorderAt: '0',
})

const parseNonNegativeInteger = (value: string, field: string) => {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new TypeError(`${field} must be a non-negative integer`)
  }
  return parsed
}

export default function InventoryPage() {
  const { t } = useLocale()
  const [inventory, setInventory] = useState<Inventory>(initialInventory)
  const [menu, setMenu] = useState(defaultMenu())
  const [selected, setSelected] = useState<StockItem | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [draft, setDraft] = useState<StockDraft>(emptyDraft)
  const [editorPin, setEditorPin] = useState('')
  const [adjustPin, setAdjustPin] = useState('')
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState<Notice>({ kind: 'idle', message: '' })
  const busy = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  const refreshInventory = useCallback(() => {
    try {
      setInventory(parseInventory(localStorage.getItem(INVENTORY_STORAGE_KEY)))
    } catch {
      setInventory(initialInventory())
    }
  }, [])

  const refreshMenu = useCallback(() => {
    try {
      setMenu(
        parseStoredMenu(localStorage.getItem(MENU_STORAGE_KEY), defaultMenu()),
      )
    } catch {
      setMenu(defaultMenu())
    }
  }, [])

  useEffect(() => {
    const load = () => {
      try {
        refreshInventory()
        refreshMenu()
        setError(false)
      } catch {
        setError(true)
      }
    }
    load()
    void consumePendingInventory(localStorage)
      .then(load)
      .catch(() => setError(true))
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [refreshInventory, refreshMenu])

  useEffect(() => {
    if (!selected) return
    returnFocus.current = document.activeElement as HTMLElement
    const focusable = () => [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>('input, button') ??
        []),
    ]
    focusable()[0]?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy.current) setSelected(null)
      if (event.key !== 'Tab') return
      const entries = focusable()
      const first = entries[0]
      const last = entries.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      returnFocus.current?.focus()
    }
  }, [selected])

  const clearDraft = () => {
    setDraft(emptyDraft())
    setEditingItemId(null)
    setEditorPin('')
  }

  const editItem = (item: StockItem) => {
    setEditingItemId(item.id)
    setDraft({
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: String(item.quantity),
      reorderAt: String(item.reorderAt),
    })
    setEditorPin('')
  }

  const saveItem = async () => {
    if (busy.current) return
    busy.current = true
    setError(false)
    setNotice({ kind: 'idle', message: '' })
    try {
      await verifyManagerPin(editorPin)
      const nextItem: StockItem = {
        id: draft.id.trim(),
        name: draft.name.trim(),
        unit: draft.unit,
        quantity: parseNonNegativeInteger(draft.quantity, 'Quantity'),
        reorderAt: parseNonNegativeInteger(draft.reorderAt, 'Reorder level'),
      }
      const next = await updateStoredInventory(localStorage, (current) =>
        saveStockItem(current, nextItem),
      )
      setInventory(next)
      clearDraft()
      setNotice({ kind: 'saved', message: 'Stock item saved.' })
    } catch {
      setError(true)
    } finally {
      busy.current = false
    }
  }

  const saveAdjustment = async () => {
    if (!selected || busy.current) return
    busy.current = true
    setError(false)
    setNotice({ kind: 'idle', message: '' })
    try {
      await verifyManagerPin(adjustPin)
      const next = await updateStoredInventory(localStorage, (current) =>
        adjustStock(
          current,
          {
            id: crypto.randomUUID(),
            stockItemId: selected.id,
            delta: Number(delta),
            reason,
            actorId: 'manager-approved',
            occurredAt: new Date().toISOString(),
          },
          'manager',
        ),
      )
      setInventory(next)
      setSelected(null)
      setDelta('')
      setReason('')
      setAdjustPin('')
      setNotice({ kind: 'saved', message: 'Stock adjusted.' })
    } catch {
      setError(true)
    } finally {
      busy.current = false
    }
  }

  const low = useMemo(
    () =>
      inventory.items.filter((item) => item.quantity <= item.reorderAt).length,
    [inventory.items],
  )
  const menuItemsAtRisk = useMemo(
    () => getMenuItemsAtRisk(menu, inventory),
    [inventory, menu],
  )
  const sortedItems = useMemo(
    () =>
      [...inventory.items].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [inventory.items],
  )

  return (
    <AppShell>
      <section className="p-4 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">{t('inventory')}</h1>
          <p className="text-muted-foreground">{t('inventoryDescription')}</p>
        </div>

        {notice.kind !== 'idle' && notice.message && (
          <p
            role="status"
            className={`mt-4 rounded-md p-3 text-sm ${
              notice.kind === 'saved'
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {notice.message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-destructive/10 p-3 text-destructive"
          >
            {t('inventoryError')}
          </p>
        )}

        <Card className="mt-6">
          <CardContent className="flex items-center gap-4 p-5">
            <AlertTriangle
              className={low ? 'text-amber-500' : 'text-emerald-500'}
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">{t('lowStock')}</p>
              <p className="text-sm text-muted-foreground">
                {low} {t('items')}
              </p>
              <p className="text-sm text-muted-foreground">
                {menuItemsAtRisk.length} {t('menuItemsAtRisk')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Stock item editor</h2>
                <p className="text-sm text-muted-foreground">
                  Add or update inventory items, reorder levels, and units.
                </p>
              </div>
              <Button variant="outline" onClick={clearDraft}>
                New item
              </Button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium">
                Item id
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  value={draft.id}
                  disabled={editingItemId !== null}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      id: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Name
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Unit
                <select
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  value={draft.unit}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      unit: event.target.value as StockItem['unit'],
                    }))
                  }
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="each">each</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Starting quantity
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  inputMode="numeric"
                  value={draft.quantity}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      quantity: event.target.value.replace(/\D/g, ''),
                    }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Reorder point
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  inputMode="numeric"
                  value={draft.reorderAt}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      reorderAt: event.target.value.replace(/\D/g, ''),
                    }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Manager PIN
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  type="password"
                  inputMode="numeric"
                  value={editorPin}
                  onChange={(event) =>
                    setEditorPin(event.target.value.replace(/\D/g, ''))
                  }
                />
              </label>
            </div>

            <Button
              className="mt-4"
              onClick={() => void saveItem()}
              disabled={
                !draft.id.trim() ||
                !draft.name.trim() ||
                !editorPin.trim() ||
                !draft.quantity.trim() ||
                !draft.reorderAt.trim()
              }
            >
              {editingItemId !== null ? 'Update item' : 'Save item'}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('reorderAt')} {item.reorderAt} {item.unit}
                    </p>
                  </div>
                  <PackageOpen aria-hidden="true" />
                </div>
                <p
                  className={`mt-4 text-2xl font-semibold ${item.quantity <= item.reorderAt ? 'text-amber-600' : ''}`}
                >
                  {item.quantity}{' '}
                  <span className="text-sm font-normal">{item.unit}</span>
                </p>
                <div className="mt-auto flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => editItem(item)}
                  >
                    <PencilLine aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      setSelected(item)
                      setDelta('')
                      setReason('')
                      setAdjustPin('')
                      setError(false)
                      setNotice({ kind: 'idle', message: '' })
                    }}
                  >
                    {t('adjustStock')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selected && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-title"
          >
            <div
              ref={dialogRef}
              className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl"
            >
              <h2 id="stock-title" className="text-xl font-semibold">
                {t('adjustStock')} · {selected.name}
              </h2>
              <label className="mt-4 block text-sm">
                {t('quantityChange')}
                <input
                  autoFocus
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  inputMode="numeric"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                />
              </label>
              <label className="mt-4 block text-sm">
                {t('reason')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <label className="mt-4 block text-sm">
                {t('managerPin')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  type="password"
                  inputMode="numeric"
                  value={adjustPin}
                  onChange={(e) =>
                    setAdjustPin(e.target.value.replace(/\D/g, ''))
                  }
                />
              </label>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  {t('cancel')}
                </Button>
                <Button
                  disabled={
                    !/^-?[1-9]\d*$/.test(delta) ||
                    !reason.trim() ||
                    adjustPin.length < 4
                  }
                  onClick={() => void saveAdjustment()}
                >
                  {t('confirm')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  )
}
