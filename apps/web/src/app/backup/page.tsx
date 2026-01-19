'use client'
import { Download, ShieldCheck, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import type { CafeBackup } from '@/lib/backup'
import { createBackup, restoreBackup, validateBackup } from '@/lib/backup'
import { verifyManagerPin } from '@/lib/manager-client'
import { AppShell } from '@/components/app-shell'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function BackupPage() {
  const { t } = useLocale()
  const [candidate, setCandidate] = useState<CafeBackup | null>(null)
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState<'idle' | 'error' | 'ready' | 'restored'>(
    'idle',
  )
  const busy = useRef(false)
  const exportBackup = async () => {
    try {
      const backup = await createBackup(localStorage)
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: 'application/json',
        }),
      )
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `cafepos-backup-${backup.createdAt.slice(0, 10)}.json`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setStatus('error')
    }
  }
  const selectFile = async (file: File | undefined) => {
    if (!file) {
      setStatus('error')
      return
    }
    try {
      const backup = await validateBackup(
        JSON.parse(await file.text()) as CafeBackup,
      )
      setCandidate(backup)
      setStatus('ready')
    } catch {
      setCandidate(null)
      setStatus('error')
    }
  }
  const restore = async () => {
    if (!candidate || busy.current) return
    busy.current = true
    try {
      await verifyManagerPin(pin)
      await restoreBackup(localStorage, candidate)
      setStatus('restored')
      setCandidate(null)
      setPin('')
    } catch {
      setStatus('error')
    } finally {
      busy.current = false
    }
  }
  return (
    <AppShell>
      <section className="p-4 md:p-8">
        <h1 className="text-3xl font-semibold">{t('backup')}</h1>
        <p className="mt-2 text-muted-foreground">{t('backupDescription')}</p>
        {status === 'error' && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-destructive/10 p-3 text-destructive"
          >
            {t('backupError')}
          </p>
        )}
        {status === 'restored' && (
          <p
            role="status"
            className="mt-4 rounded-md bg-emerald-500/10 p-3 text-emerald-700"
          >
            {t('restoreComplete')}
          </p>
        )}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <Download className="size-8 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-semibold">
                {t('exportBackup')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('exportBackupDescription')}
              </p>
              <Button className="mt-5" onClick={() => void exportBackup()}>
                {t('downloadBackup')}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Upload className="size-8 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-semibold">
                {t('restoreBackup')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('restoreBackupDescription')}
              </p>
              <label className="mt-5 inline-flex h-10 cursor-pointer items-center rounded-md border px-4 text-sm font-medium">
                {t('chooseBackup')}
                <input
                  className="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => void selectFile(event.target.files?.[0])}
                />
              </label>
              {candidate && (
                <div className="mt-5 rounded-lg border p-4">
                  <p className="flex items-center gap-2 font-medium">
                    <ShieldCheck
                      className="size-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    {t('verifiedBackup')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(candidate.createdAt).toLocaleString()}
                  </p>
                  <label className="mt-4 block text-sm">
                    {t('managerPin')}
                    <input
                      className="mt-2 h-11 w-full rounded-md border bg-background px-3"
                      type="password"
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, ''))
                      }
                    />
                  </label>
                  <Button
                    variant="destructive"
                    className="mt-4"
                    disabled={pin.length < 4}
                    onClick={() => void restore()}
                  >
                    {t('confirmRestore')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  )
}
