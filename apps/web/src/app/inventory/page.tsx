'use client'
import { AlertTriangle, PackageOpen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { adjustStock, type Inventory, type StockItem } from '@cafepos/domain'
import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { verifyManagerPin } from '@/lib/manager-client'
import {
  INVENTORY_STORAGE_KEY,
  initialInventory,
  parseInventory,
  updateStoredInventory,
} from '@/lib/inventory-storage'

export default function InventoryPage() {
  const { t } = useLocale()
  const [inventory, setInventory] = useState<Inventory>(initialInventory)
  const [selected, setSelected] = useState<StockItem | null>(null)
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const busy = useRef(false)
  useEffect(() => {
    const load = () => {
      try {
        setInventory(
          parseInventory(localStorage.getItem(INVENTORY_STORAGE_KEY)),
        )
        setError(false)
      } catch {
        setError(true)
      }
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])
  const save = async () => {
    if (!selected || busy.current) return
    busy.current = true
    setError(false)
    try {
      await verifyManagerPin(pin)
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
      setPin('')
    } catch {
      setError(true)
    } finally {
      busy.current = false
    }
  }
  const low = inventory.items.filter(
    (item) => item.quantity <= item.reorderAt,
  ).length
  return (
    <AppShell>
      <section className="p-4 md:p-8">
        <h1 className="text-3xl font-semibold">{t('inventory')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('inventoryDescription')}
        </p>
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
            </div>
          </CardContent>
        </Card>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {inventory.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
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
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() => setSelected(item)}
                >
                  {t('adjustStock')}
                </Button>
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
            <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
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
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
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
                    pin.length < 4
                  }
                  onClick={() => void save()}
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
