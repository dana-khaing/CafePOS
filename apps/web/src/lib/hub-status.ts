export type HubConnection = 'checking' | 'connected' | 'disconnected'

export type HubProbeResult = Readonly<{
  connection: HubConnection
  checkedAt: string
  latencyMs?: number
  branch?: Readonly<{
    id: string
    name: string
  }>
  publicOrigin?: string
  uptimeSeconds?: number
  sync?: Readonly<{
    pending: number
    inflight: number
    total: number
  }>
  error?: string
}>

async function readJson<T>(request: typeof fetch, url: string): Promise<T> {
  const response = await request(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(2_000),
  })
  if (!response.ok) {
    throw new Error(`Hub request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export async function probeHub(
  hubUrl: string,
  request: typeof fetch = fetch,
): Promise<HubProbeResult> {
  const baseUrl = hubUrl.replace(/\/$/, '')
  const checkedAt = new Date().toISOString()
  const startedAt = performance.now()

  try {
    const [statusResult, syncResult] = await Promise.allSettled([
      readJson<{
        status?: unknown
        branch?: unknown
        publicOrigin?: unknown
        uptimeSeconds?: unknown
      }>(request, `${baseUrl}/v1/status`),
      readJson<{
        status?: unknown
        outbox?: unknown
      }>(request, `${baseUrl}/v1/sync/status`),
    ])

    if (statusResult.status !== 'fulfilled') {
      throw statusResult.reason instanceof Error
        ? statusResult.reason
        : new Error('Branch hub unreachable.')
    }

    const status = statusResult.value

    const branch = status.branch
    const syncOutbox =
      syncResult.status === 'fulfilled' &&
      syncResult.value.outbox &&
      typeof syncResult.value.outbox === 'object' &&
      syncResult.value.outbox !== null
        ? (syncResult.value.outbox as {
            pending?: unknown
            inflight?: unknown
            total?: unknown
          })
        : null

    if (
      status.status !== 'ready' ||
      !branch ||
      typeof branch !== 'object' ||
      typeof (branch as { id?: unknown }).id !== 'string' ||
      typeof (branch as { name?: unknown }).name !== 'string'
    ) {
      return {
        connection: 'disconnected',
        checkedAt,
        error: 'Branch hub returned an unexpected status payload.',
      }
    }

    return {
      connection: 'connected',
      checkedAt,
      latencyMs: Math.round(performance.now() - startedAt),
      branch: {
        id: (branch as { id: string }).id,
        name: (branch as { name: string }).name,
      },
      publicOrigin:
        typeof status.publicOrigin === 'string'
          ? status.publicOrigin
          : undefined,
      uptimeSeconds:
        typeof status.uptimeSeconds === 'number'
          ? status.uptimeSeconds
          : undefined,
      sync:
        syncOutbox &&
        typeof syncOutbox.pending === 'number' &&
        typeof syncOutbox.inflight === 'number' &&
        typeof syncOutbox.total === 'number'
          ? {
              pending: syncOutbox.pending,
              inflight: syncOutbox.inflight,
              total: syncOutbox.total,
            }
          : undefined,
    }
  } catch (error) {
    return {
      connection: 'disconnected',
      checkedAt,
      latencyMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : 'Branch hub unreachable.',
    }
  }
}
