'use client'

import { Cloud, CloudOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'

export function ConnectivityChip() {
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
      {online ? 'Hub connected' : 'Working offline'}
    </Badge>
  )
}
