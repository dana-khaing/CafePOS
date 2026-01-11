export type HubConfig = Readonly<{
  host: string
  port: number
  branchId: string
  branchName: string
  publicOrigin: string
  webOrigins: readonly string[]
  outboxPath: string
  branchToken: string
}>

function required(value: string | undefined, name: string) {
  if (!value?.trim()) throw new Error(`${name} is required`)
  return value.trim()
}

export function loadHubConfig(env: NodeJS.ProcessEnv = process.env): HubConfig {
  const port = Number(env.PORT ?? 4310)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError('PORT must be an integer from 1 to 65535')
  }

  const host = env.HOST?.trim() || '127.0.0.1'
  if (host === '0.0.0.0' && env.HUB_ALLOW_LAN !== 'true') {
    throw new Error('HUB_ALLOW_LAN=true is required to bind all interfaces')
  }

  const publicOrigin = required(env.HUB_PUBLIC_ORIGIN, 'HUB_PUBLIC_ORIGIN')
  const webOrigins = (env.HUB_WEB_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  for (const origin of [publicOrigin, ...webOrigins]) new URL(origin)

  return {
    host,
    port,
    publicOrigin,
    webOrigins,
    branchId: required(env.HUB_BRANCH_ID, 'HUB_BRANCH_ID'),
    branchName: required(env.HUB_BRANCH_NAME, 'HUB_BRANCH_NAME'),
    branchToken: required(env.HUB_BRANCH_TOKEN, 'HUB_BRANCH_TOKEN'),
    outboxPath: env.HUB_OUTBOX_PATH?.trim() || './data/outbox.json',
  }
}
