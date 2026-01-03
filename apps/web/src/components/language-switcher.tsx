'use client'

import { Languages } from 'lucide-react'

import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()
  const nextLocale = locale === 'en' ? 'th' : 'en'

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setLocale(nextLocale)}
      aria-label={`${t('language')}: ${locale === 'en' ? t('english') : t('thai')}`}
      title={locale === 'en' ? t('thai') : t('english')}
    >
      <Languages aria-hidden="true" />
      <span className="uppercase">{locale}</span>
    </Button>
  )
}
