export const membershipRoles = [
  'owner',
  'admin',
  'manager',
  'cashier',
  'kitchen',
] as const

export type MembershipRole = (typeof membershipRoles)[number]

export const permissions = [
  'organization.manage',
  'branch.create',
  'branch.manage',
  'staff.manage',
  'branch.staff.assign',
  'order.create',
  'kitchen.view',
  'report.view',
  'refund.create',
] as const

export type Permission = (typeof permissions)[number]

const rolePermissions: Record<MembershipRole, ReadonlySet<Permission>> = {
  owner: new Set(permissions),
  admin: new Set(permissions),
  manager: new Set([
    'branch.manage',
    'branch.staff.assign',
    'order.create',
    'kitchen.view',
    'report.view',
    'refund.create',
  ]),
  cashier: new Set(['order.create']),
  kitchen: new Set(['kitchen.view']),
}

export function hasPermission(
  role: MembershipRole,
  permission: Permission,
): boolean {
  if (!membershipRoles.includes(role)) return false
  if (!permissions.includes(permission)) return false
  return rolePermissions[role].has(permission)
}
