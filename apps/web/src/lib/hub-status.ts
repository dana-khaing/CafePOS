export type HubConnection = 'checking' | 'connected' | 'disconnected'

export async function probeHub(
  hubUrl: string,
  request: typeof fetch = fetch,
): Promise<HubConnection> {
  try {
    const response = await request(`${hubUrl.replace(/\/$/, '')}/v1/status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    })
    if (!response.ok) return 'disconnected'
    const body = (await response.json()) as { status?: unknown }
    return body.status === 'ready' ? 'connected' : 'disconnected'
  } catch {
    return 'disconnected'
  }
}
