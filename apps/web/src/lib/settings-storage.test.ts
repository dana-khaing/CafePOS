import { describe, expect, it } from 'vitest'
import {
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  parseSettings,
  saveSettings,
  serializeSettings,
  validateSettings,
} from './settings-storage'

const storage = (values = new Map<string, string>()) =>
  ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }) as unknown as Storage

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

  it('accepts Unicode text at the documented boundaries', () => {
    const value = {
      ...defaultSettings(),
      cafeName: 'กา'.repeat(40),
      branchName: 'ส'.repeat(80),
      receiptFooter: 'ข'.repeat(500),
    }
    expect(validateSettings(value)).toEqual(value)
  })

  it('rejects overlong, empty, and malformed settings', () => {
    expect(() =>
      validateSettings({ ...defaultSettings(), cafeName: 'x'.repeat(81) }),
    ).toThrow('invalid')
    expect(() =>
      validateSettings({ ...defaultSettings(), receiptFooter: ' ' }),
    ).toThrow('invalid')
    expect(() => parseSettings('{"version":1}')).toThrow()
    expect(() => parseSettings('{')).toThrow()
  })

  it('serializes concurrent saves through the shared lock', async () => {
    const calls: string[] = []
    const locks = {
      request: async (name: string, callback: () => unknown) => {
        calls.push(name)
        return callback()
      },
    } as unknown as LockManager
    const target = storage()
    await Promise.all([
      saveSettings(
        target,
        { ...defaultSettings(), branchName: 'หนึ่ง' },
        locks,
      ),
      saveSettings(target, { ...defaultSettings(), branchName: 'สอง' }, locks),
    ])
    expect(calls).toHaveLength(2)
    expect(parseSettings(target.getItem(SETTINGS_STORAGE_KEY)).branchName).toBe(
      'สอง',
    )
  })
})
