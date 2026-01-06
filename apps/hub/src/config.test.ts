import { describe, expect, it } from 'vitest'

import { loadHubConfig } from './config'

const validEnv = {
  HUB_PUBLIC_ORIGIN: 'https://branch.local.cafepos.test',
  HUB_BRANCH_ID: 'branch-riverside',
  HUB_BRANCH_NAME: 'Riverside Cafe',
}

describe('hub configuration', () => {
  it('loads secure loopback defaults', () => {
    expect(loadHubConfig(validEnv)).toMatchObject({
      host: '127.0.0.1',
      port: 4310,
    })
  })

  it('requires explicit acknowledgement for LAN binding', () => {
    expect(() => loadHubConfig({ ...validEnv, HOST: '0.0.0.0' })).toThrow(
      'HUB_ALLOW_LAN',
    )
    expect(
      loadHubConfig({ ...validEnv, HOST: '0.0.0.0', HUB_ALLOW_LAN: 'true' })
        .host,
    ).toBe('0.0.0.0')
  })

  it('rejects invalid ports and missing branch identity', () => {
    expect(() => loadHubConfig({ ...validEnv, PORT: '70000' })).toThrow(
      RangeError,
    )
    expect(() => loadHubConfig({ ...validEnv, HUB_BRANCH_ID: '' })).toThrow(
      'HUB_BRANCH_ID',
    )
  })
})
