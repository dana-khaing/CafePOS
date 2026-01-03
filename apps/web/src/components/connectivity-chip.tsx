'use client'

import { Cloud, CloudOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/components/locale-provider'

export function ConnectivityChip() {
  const { t } = useLocale()
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <Badge variant={online ? 'success' : 'warning'} aria-live="polite">
      {online ? <Cloud aria-hidden="true" /> : <CloudOff aria-hidden="true" />}
      {online ? t('connected') : t('disconnected')}
    </Badge>
  )
}
