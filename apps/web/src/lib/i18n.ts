export const locales = ['en', 'th'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export function isLocale(value: string | null): value is Locale {
  return locales.includes(value as Locale)
}

export function formatMoney(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    style: 'currency',
    currency: 'THB',
    currencyDisplay: 'code',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

export function formatCafeDate(date: Date, locale: Locale) {
  const parts = new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(date)
  const weekday = parts.find((entry) => entry.type === 'weekday')?.value ?? ''
  const day = parts.find((entry) => entry.type === 'day')?.value ?? ''
  const month = parts.find((entry) => entry.type === 'month')?.value ?? ''
  return `${weekday} ${day} ${month}`.trim()
}
