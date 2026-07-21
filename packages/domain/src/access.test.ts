import { describe, expect, it } from 'vitest'

import { hasPermission, membershipRoles, permissions } from './access'

describe('membership permissions', () => {
  it('gives owners and admins every tenant permission', () => {
    for (const permission of permissions) {
      expect(hasPermission('owner', permission)).toBe(true)
      expect(hasPermission('admin', permission)).toBe(true)
    }
  })

  it('limits managers to branch operations and reporting', () => {
    expect(hasPermission('manager', 'branch.manage')).toBe(true)
    expect(hasPermission('manager', 'branch.staff.assign')).toBe(true)
    expect(hasPermission('manager', 'staff.manage')).toBe(false)
    expect(hasPermission('manager', 'organization.manage')).toBe(false)
    expect(hasPermission('manager', 'branch.create')).toBe(false)
  })

  it('keeps operational roles narrowly scoped', () => {
    expect(hasPermission('cashier', 'order.create')).toBe(true)
    expect(hasPermission('cashier', 'report.view')).toBe(false)
    expect(hasPermission('kitchen', 'kitchen.view')).toBe(true)
    expect(hasPermission('kitchen', 'order.create')).toBe(false)
  })

  it('fails closed for untrusted runtime values', () => {
    expect(
      hasPermission(
        'unknown' as (typeof membershipRoles)[number],
        'order.create',
      ),
    ).toBe(false)
    expect(
      hasPermission('owner', 'unknown' as (typeof permissions)[number]),
    ).toBe(false)
  })
})
