'use client'

import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { CloudOff } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function OfflinePage() {
  const { t } = useLocale()
  return (
    <AppShell>
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <span className="mb-3 grid size-12 place-items-center rounded-lg bg-secondary">
              <CloudOff className="size-5" aria-hidden="true" />
            </span>
            <CardTitle>{t('offlineTitle')}</CardTitle>
            <CardDescription>{t('offlineDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t('offlineWiFiHelp')}</p>
            <ul className="list-disc space-y-1 ps-5">
              <li>{t('offlineHubHelp')}</li>
              <li>{t('offlineRetryHelp')}</li>
              <li>{t('offlineSettingsHelp')}</li>
            </ul>
            <p>{t('offlineStorageHelp')}</p>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  )
}
