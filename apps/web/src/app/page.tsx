import {
  ArrowRight,
  LayoutGrid,
  Plus,
  ReceiptText,
  Utensils,
} from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const quickActions = [
  {
    label: 'New counter order',
    description: 'Dine in or takeaway',
    icon: Plus,
  },
  { label: 'Open tables', description: '3 active tabs', icon: LayoutGrid },
  {
    label: 'Kitchen queue',
    description: '4 tickets preparing',
    icon: Utensils,
  },
]

const activity = [
  {
    reference: '#1042',
    detail: 'Table 6 · 4 items',
    total: 'THB 640',
    status: 'Preparing',
  },
  {
    reference: '#1041',
    detail: 'Takeaway · 2 items',
    total: 'THB 185',
    status: 'Ready',
  },
  {
    reference: '#1040',
    detail: 'Counter · 3 items',
    total: 'THB 320',
    status: 'Paid',
  },
]

export default function HomePage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Tuesday, 21 July
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Good afternoon, Mina
            </h1>
            <p className="mt-2 text-muted-foreground">
              Riverside Café · Bangkok
            </p>
          </div>
          <Button size="lg">
            <Plus aria-hidden="true" />
            New order
          </Button>
        </section>

        <section aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="sr-only">
            Quick actions
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => (
              <Card
                key={action.label}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <action.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{action.label}</span>
                    <span className="block text-sm text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net sales today</CardDescription>
              <CardTitle className="font-mono text-2xl">THB 12,840</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="success">+8.4% vs last Tuesday</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Orders</CardDescription>
              <CardTitle className="font-mono text-2xl">48</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Average THB 267.50
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current shift</CardDescription>
              <CardTitle className="text-2xl">Open · 5h 18m</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Till 1 · Mina</Badge>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest orders from this branch</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-1">
            {activity.map((item) => (
              <div
                key={item.reference}
                className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-muted"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary">
                  <ReceiptText className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold">
                    {item.reference}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block font-mono text-sm font-semibold">
                    {item.total}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.status}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
