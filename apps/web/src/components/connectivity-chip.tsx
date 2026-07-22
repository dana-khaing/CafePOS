'use client'

import { Cloud, CloudOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/components/locale-provider'
import { type HubConnection, probeHub } from '@/lib/hub-status'

const hubUrl = process.env.NEXT_PUBLIC_BRANCH_HUB_URL ?? 'http://127.0.0.1:4310'

export function ConnectivityChip() {
  const { t } = useLocale()
  const [connection, setConnection] = useState<HubConnection>('checking')

  useEffect(() => {
    let active = true
    const update = async () => {
      const status = await probeHub(hubUrl)
      if (active) setConnection(status)
    }
    void update()
    const interval = window.setInterval(update, 15_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const connected = connection === 'connected'

  return (
    <Badge variant={connected ? 'success' : 'warning'} aria-live="polite">
      {connected ? (
        <Cloud aria-hidden="true" />
      ) : (
        <CloudOff aria-hidden="true" />
      )}
      {connection === 'checking'
        ? t('checkingHub')
        : connected
          ? t('connected')
          : t('disconnected')}
    </Badge>
  )
}
