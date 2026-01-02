import { CloudOff } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="mb-3 grid size-12 place-items-center rounded-lg bg-secondary">
            <CloudOff className="size-5" aria-hidden="true" />
          </span>
          <CardTitle>CafePOS is offline</CardTitle>
          <CardDescription>
            The branch hub could not be reached from this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Check the café Wi-Fi and branch hub. Existing open tabs remain stored
          on the hub and will be available after reconnecting.
        </CardContent>
      </Card>
    </main>
  )
}
