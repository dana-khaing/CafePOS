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
            The branch hub could not be reached or did not report a ready
            status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Check the café Wi-Fi, the hub machine, and the branch hub app.</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>Confirm the hub service is running on the branch server.</li>
            <li>Refresh the page or use the retry button in the header.</li>
            <li>
              Make sure the branch hub URL in the app settings is correct.
            </li>
          </ul>
          <p>
            Existing open tabs remain stored on the hub and will be available
            after reconnecting.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
