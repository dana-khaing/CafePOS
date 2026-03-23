import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  ReceiptText,
  PackageOpen,
  Settings,
  Utensils,
} from 'lucide-react'
import type { Route } from 'next'

export type NavigationItem = Readonly<{
  label:
    | 'overview'
    | 'menu'
    | 'orders'
    | 'history'
    | 'shifts'
    | 'kitchen'
    | 'inventory'
    | 'backup'
    | 'reports'
    | 'settings'
  href: Route
  icon: typeof LayoutDashboard
  available: boolean
}>

export const navigation: readonly NavigationItem[] = [
  { label: 'overview', href: '/', icon: LayoutDashboard, available: true },
  { label: 'menu', href: '/menu', icon: BookOpen, available: true },
  {
    label: 'inventory',
    href: '/inventory' as Route,
    icon: PackageOpen,
    available: true,
  },
  {
    label: 'orders',
    href: '/orders' as Route,
    icon: ReceiptText,
    available: true,
  },
  {
    label: 'history',
    href: '/history' as Route,
    icon: ReceiptText,
    available: true,
  },
  {
    label: 'shifts',
    href: '/shifts' as Route,
    icon: ReceiptText,
    available: true,
  },
  {
    label: 'kitchen',
    href: '/kitchen' as Route,
    icon: Utensils,
    available: true,
  },
  {
    label: 'reports',
    href: '/reports' as Route,
    icon: BarChart3,
    available: true,
  },
  {
    label: 'backup',
    href: '/backup' as Route,
    icon: Settings,
    available: true,
  },
  {
    label: 'settings',
    href: '/settings' as Route,
    icon: Settings,
    available: true,
  },
]
