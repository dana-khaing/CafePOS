'use client'

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  defaultLocale,
  formatCafeDate,
  formatMoney,
  isLocale,
  type Locale,
} from '@/lib/i18n'
import { type MessageKey, messages } from '@/lib/messages'

const STORAGE_KEY = 'cafepos.locale'

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  money: (amount: number) => string
  date: (value: Date) => string
  t: (key: MessageKey) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(storedLocale)) setLocale(storedLocale)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      money: (amount: number) => formatMoney(amount, locale),
      date: (dateValue: Date) => formatCafeDate(dateValue, locale),
      t: (key: MessageKey) => messages[locale][key],
    }),
    [locale],
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useLocale must be used within LocaleProvider')
  return context
}
