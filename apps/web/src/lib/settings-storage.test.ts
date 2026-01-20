import { describe, expect, it } from 'vitest'
import {
  defaultSettings,
  parseSettings,
  serializeSettings,
  validateSettings,
} from './settings-storage'

describe('settings', () => {
  it('round trips validated branch settings', () => {
    const value = defaultSettings()
    expect(parseSettings(serializeSettings(value))).toEqual(value)
  })
  it('rejects invalid timezones and printer widths', () => {
    expect(() =>
      validateSettings({ ...defaultSettings(), timezone: 'Moon/Base' }),
    ).toThrow('timezone')
    expect(() =>
      validateSettings({ ...defaultSettings(), printerWidth: 42 as 58 }),
    ).toThrow('invalid')
  })
})
