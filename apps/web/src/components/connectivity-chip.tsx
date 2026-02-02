'use client'

import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/locale-provider'
import { type HubProbeResult, probeHub } from '@/lib/hub-status'

const hubUrl = process.env.NEXT_PUBLIC_BRANCH_HUB_URL ?? 'http://127.0.0.1:4310'

export function formatHubCheckedAt(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}

function formatUptime(seconds?: number) {
  if (seconds == null) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts = [
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' ') : '< 1m'
}

export function ConnectivityChip() {
  const { t } = useLocale()
  const [status, setStatus] = useState<HubProbeResult>({
    connection: 'checking',
    checkedAt: '',
  })
  const activeRef = useRef(true)
  const inFlightRef = useRef(false)

  const update = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const next = await probeHub(hubUrl)
      if (activeRef.current) setStatus(next)
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    activeRef.current = true
    void update()
    const interval = window.setInterval(update, 15_000)
    return () => {
      activeRef.current = false
      window.clearInterval(interval)
    }
  }, [update])

  const connected = status.connection === 'connected'
  const hasBacklog = Boolean(status.sync && status.sync.pending > 0)
  const label =
    status.connection === 'checking'
      ? t('checkingHub')
      : connected
        ? hasBacklog
          ? `${t('connected')} · ${status.sync?.pending} ${t('syncPending')}`
          : t('connected')
        : t('disconnected')
  const details = [
    status.branch ? `${status.branch.name} (${status.branch.id})` : null,
    status.publicOrigin ?? null,
    status.uptimeSeconds != null
      ? `Uptime ${formatUptime(status.uptimeSeconds)}`
      : null,
    status.connection !== 'checking' && status.checkedAt
      ? `Checked ${formatHubCheckedAt(status.checkedAt)}`
      : null,
    status.error ? `Last error: ${status.error}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={connected ? (hasBacklog ? 'warning' : 'success') : 'warning'}
        aria-live="polite"
        title={details || label}
      >
        {connected ? (
          <Cloud aria-hidden="true" />
        ) : (
          <CloudOff aria-hidden="true" />
        )}
        {label}
      </Badge>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8"
        onClick={() => void update()}
        aria-label={t('retryHub')}
        title={t('retryHub')}
      >
        <RefreshCw className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
