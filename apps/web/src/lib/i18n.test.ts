import { describe, expect, it } from 'vitest'

import { formatCafeDate, formatMoney, isLocale } from './i18n'

describe('localization utilities', () => {
  it('accepts only supported locale identifiers', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('th')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })

  it('formats Thai baht for each supported locale', () => {
    expect(formatMoney(12840, 'en')).toContain('12,840')
    expect(formatMoney(12840, 'th')).toContain('12,840')
    expect(formatMoney(267.5, 'en')).toContain('267.50')
  })

  it('formats the cafe date in the selected language', () => {
    const date = new Date(2026, 6, 21)

    expect(formatCafeDate(date, 'en')).toBe('Tuesday 21 July')
    expect(formatCafeDate(date, 'th')).toContain('กรกฎาคม')
  })
})
