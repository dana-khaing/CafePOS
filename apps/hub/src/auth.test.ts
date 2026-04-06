import { describe, expect, it } from 'vitest'

import { authenticatesBranch, authenticatesManagerPin } from './auth'

describe('authenticatesBranch', () => {
  it('accepts the exact configured bearer token', () => {
    expect(authenticatesBranch('Bearer device-token', 'device-token')).toBe(
      true,
    )
  })

  it('rejects a wrong token of the same length', () => {
    expect(authenticatesBranch('Bearer device-tokeX', 'device-token')).toBe(
      false,
    )
  })

  it('rejects a token of a different length', () => {
    expect(authenticatesBranch('Bearer short', 'device-token')).toBe(false)
    expect(
      authenticatesBranch('Bearer device-token-but-longer', 'device-token'),
    ).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(authenticatesBranch(undefined, 'device-token')).toBe(false)
  })
})

describe('authenticatesManagerPin', () => {
  it('accepts the exact configured pin', () => {
    expect(authenticatesManagerPin('4242', '4242')).toBe(true)
  })

  it('rejects a wrong pin of the same length', () => {
    expect(authenticatesManagerPin('4243', '4242')).toBe(false)
  })

  it('rejects a pin of a different length', () => {
    expect(authenticatesManagerPin('42', '4242')).toBe(false)
  })

  it('rejects a missing or array-valued header', () => {
    expect(authenticatesManagerPin(undefined, '4242')).toBe(false)
    expect(authenticatesManagerPin(['4242'], '4242')).toBe(true)
    expect(authenticatesManagerPin([], '4242')).toBe(false)
  })
})
