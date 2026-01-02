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
import type { ReactNode } from 'react'
import { useState } from 'react'

import { ConnectivityChip } from '@/components/connectivity-chip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navigation = [
  { label: 'Overview', href: '/' as const, icon: LayoutDashboard },
  { label: 'Orders', href: '/' as const, icon: ReceiptText },
  { label: 'Kitchen', href: '/' as const, icon: Utensils },
  { label: 'Reports', href: '/' as const, icon: BarChart3 },
  { label: 'Settings', href: '/' as const, icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-40 flex w-64 -translate-x-full flex-col border-e bg-card p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          menuOpen && 'translate-x-0',
        )}
      >
        <div className="flex h-14 items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Coffee className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">
              CafePOS
            </span>
            <span className="block text-xs text-muted-foreground">
              Riverside Café
            </span>
          </span>
        </div>

        <nav aria-label="Primary" className="mt-6 grid gap-1">
          {navigation.map((item, index) => (
            <Button
              key={item.label}
              variant={index === 0 ? 'secondary' : 'ghost'}
              className="justify-start"
              asChild
            >
              <Link href={item.href} onClick={() => setMenuOpen(false)}>
                <item.icon aria-hidden="true" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="mt-auto rounded-lg bg-muted p-3 text-sm">
          <span className="font-medium">Branch hub</span>
          <span className="mt-1 block text-muted-foreground">
            Last sync just now
          </span>
        </div>
      </aside>

      {menuOpen ? (
        <button
          className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>
            <ConnectivityChip />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              Cashier
            </span>
            <span
              className="grid size-9 place-items-center rounded-full bg-secondary font-semibold"
              aria-label="Signed in as Mina"
            >
              MK
            </span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
