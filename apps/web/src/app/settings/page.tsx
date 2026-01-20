'use client'
import { Save, Settings2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { verifyManagerPin } from '@/lib/manager-client'
import {
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  parseSettings,
  saveSettings,
  type CafeSettings,
} from '@/lib/settings-storage'

export default function SettingsPage() {
  const { t } = useLocale()
  const [settings, setSettings] = useState<CafeSettings>(defaultSettings)
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const busy = useRef(false)
  useEffect(() => {
    try {
      setSettings(parseSettings(localStorage.getItem(SETTINGS_STORAGE_KEY)))
    } catch {
      setStatus('error')
    }
  }, [])
  const update = <K extends keyof CafeSettings>(
    key: K,
    value: CafeSettings[K],
  ) => {
    setStatus('idle')
    setSettings((current) => ({ ...current, [key]: value }))
  }
  const save = async () => {
    if (busy.current) return
    busy.current = true
    setStatus('idle')
    try {
      await verifyManagerPin(pin)
      await saveSettings(localStorage, settings)
      setPin('')
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      busy.current = false
    }
  }
  return (
    <AppShell>
      <section className="p-4 md:p-8">
        <h1 className="text-3xl font-semibold">{t('settings')}</h1>
        <p className="mt-2 text-muted-foreground">{t('settingsDescription')}</p>
        {status === 'error' && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-destructive/10 p-3 text-destructive"
          >
            {t('settingsError')}
          </p>
        )}
        {status === 'saved' && (
          <p
            role="status"
            className="mt-4 rounded-md bg-emerald-500/10 p-3 text-emerald-700"
          >
            {t('settingsSaved')}
          </p>
        )}
        <Card className="mt-6 max-w-3xl">
          <CardContent className="p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Settings2 aria-hidden="true" />
              {t('branchProfile')}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                {t('cafeLabel')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  maxLength={80}
                  value={settings.cafeName}
                  onChange={(e) => update('cafeName', e.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                {t('branchLabel')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  maxLength={80}
                  value={settings.branchName}
                  onChange={(e) => update('branchName', e.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                {t('timezone')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  value={settings.timezone}
                  onChange={(e) => update('timezone', e.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                {t('printerWidth')}
                <select
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  value={settings.printerWidth}
                  onChange={(e) =>
                    update('printerWidth', Number(e.target.value) as 58 | 80)
                  }
                >
                  <option value="58">58 mm</option>
                  <option value="80">80 mm</option>
                </select>
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                {t('receiptFooter')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  maxLength={500}
                  value={settings.receiptFooter}
                  onChange={(e) => update('receiptFooter', e.target.value)}
                />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                {t('managerPin')}
                <input
                  className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </label>
            </div>
            <Button
              className="mt-6"
              disabled={pin.length < 4}
              onClick={() => void save()}
            >
              <Save aria-hidden="true" />
              {t('saveSettings')}
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  )
}
