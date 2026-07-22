'use client'

import { ChefHat, Clock3, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { type KitchenTicket } from '@cafepos/domain'

import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  advanceKitchenTicketAtHub,
  loadKitchenTickets,
} from '@/lib/kitchen-client'

export default function KitchenPage() {
  const { t } = useLocale()
  const [tickets, setTickets] = useState<readonly KitchenTicket[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [busyTicket, setBusyTicket] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try {
      setTickets(await loadKitchenTickets())
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 5000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const advance = async (ticket: KitchenTicket) => {
    if (busyTicket === ticket.id) return
    setBusyTicket(ticket.id)
    try {
      const updated = await advanceKitchenTicketAtHub(ticket.id, ticket.status)
      setTickets((current) =>
        updated.status === 'completed'
          ? current.filter((entry) => entry.id !== updated.id)
          : current.map((entry) => (entry.id === updated.id ? updated : entry)),
      )
    } catch {
      setStatus('error')
    } finally {
      setBusyTicket(null)
    }
  }

  const action = (ticket: KitchenTicket) =>
    ticket.status === 'queued'
      ? t('startPreparing')
      : ticket.status === 'preparing'
        ? t('markReady')
        : t('completeTicket')

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-semibold">
              <ChefHat aria-hidden="true" />
              {t('kitchenDisplay')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('kitchenDescription')}
            </p>
          </div>
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCw aria-hidden="true" />
            {t('refresh')}
          </Button>
        </header>
        {status === 'error' && (
          <p
            role="alert"
            className="mt-6 rounded-lg bg-destructive/10 p-4 text-destructive"
          >
            {t('kitchenUnavailable')}
          </p>
        )}
        {status === 'loading' && (
          <p role="status" className="mt-8 text-muted-foreground">
            {t('loadingKitchen')}
          </p>
        )}
        {status === 'ready' && tickets.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            {t('kitchenClear')}
          </div>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className={
                ticket.status === 'ready'
                  ? 'border-primary ring-2 ring-primary/20'
                  : ''
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge>{t(ticket.status)}</Badge>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock3 className="size-4" aria-hidden="true" />
                    {new Date(ticket.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <CardTitle className="mt-3">
                  {ticket.diningMode === 'table'
                    ? `${t('table')} ${ticket.tableNumber}`
                    : t(ticket.diningMode)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-4">
                  {ticket.lines.map((line) => (
                    <li key={line.id} className="border-t pt-3">
                      <p className="text-lg font-semibold">
                        <span className="me-2 text-primary">
                          {line.quantity}×
                        </span>
                        {line.name}
                      </p>
                      {line.modifiers.length > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {line.modifiers.join(', ')}
                        </p>
                      )}
                      {line.note && (
                        <p className="mt-2 rounded-md bg-muted p-2 text-sm">
                          {line.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  size="lg"
                  disabled={busyTicket === ticket.id}
                  onClick={() => void advance(ticket)}
                >
                  {action(ticket)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </AppShell>
  )
}
