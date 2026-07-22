import { addMoney, money, subtractMoney, type Money } from './money.js'
import type { MembershipRole } from './access.js'

export type CashMovement = Readonly<{
  id: string
  type: 'sale' | 'refund' | 'paid-in' | 'paid-out'
  amount: Money
  reason: string
  occurredAt: string
}>
export type CashShift = Readonly<{
  id: string
  branchId: string
  openedBy: string
  openedAt: string
  openingFloat: Money
  movements: readonly CashMovement[]
  status: 'open' | 'closed'
  closedBy?: string
  closedAt?: string
  countedCash?: Money
  expectedCash?: Money
  variance?: Money
  version: number
}>

function validateMovement(movement: CashMovement, currency: Money['currency']) {
  if (
    !movement.id?.trim() ||
    !movement.reason?.trim() ||
    !['sale', 'refund', 'paid-in', 'paid-out'].includes(movement.type) ||
    movement.amount.currency !== currency ||
    !Number.isSafeInteger(movement.amount.minor) ||
    movement.amount.minor < 1 ||
    Number.isNaN(Date.parse(movement.occurredAt))
  )
    throw new TypeError('Cash movement is invalid')
}
export function expectedDrawerCash(shift: CashShift) {
  return shift.movements.reduce(
    (total, entry) =>
      entry.type === 'sale' || entry.type === 'paid-in'
        ? addMoney(total, entry.amount)
        : subtractMoney(total, entry.amount),
    shift.openingFloat,
  )
}
export function validateCashShift(shift: CashShift): CashShift {
  if (
    !shift.id?.trim() ||
    !shift.branchId?.trim() ||
    !shift.openedBy?.trim() ||
    Number.isNaN(Date.parse(shift.openedAt)) ||
    !Number.isSafeInteger(shift.openingFloat.minor) ||
    shift.openingFloat.minor < 0 ||
    !Number.isSafeInteger(shift.version) ||
    shift.version < 1
  )
    throw new TypeError('Cash shift identity is invalid')
  if (shift.status !== 'open' && shift.status !== 'closed')
    throw new TypeError('Cash shift status is invalid')
  const ids = new Set<string>()
  let previousAt = Date.parse(shift.openedAt)
  for (const entry of shift.movements) {
    validateMovement(entry, shift.openingFloat.currency)
    if (ids.has(entry.id))
      throw new TypeError('Cash movement ids must be unique')
    ids.add(entry.id)
    const occurredAt = Date.parse(entry.occurredAt)
    if (occurredAt < previousAt)
      throw new TypeError('Cash movements must be chronological')
    previousAt = occurredAt
  }
  const expected = expectedDrawerCash(shift)
  if (expected.minor < 0)
    throw new TypeError('Expected drawer cash cannot be negative')
  if (shift.status === 'closed') {
    if (
      !shift.closedBy?.trim() ||
      !shift.closedAt ||
      Number.isNaN(Date.parse(shift.closedAt)) ||
      !shift.countedCash ||
      !shift.expectedCash ||
      !shift.variance ||
      Date.parse(shift.closedAt) < previousAt ||
      shift.countedCash.currency !== expected.currency ||
      !Number.isSafeInteger(shift.countedCash.minor) ||
      shift.countedCash.minor < 0 ||
      shift.expectedCash.currency !== expected.currency ||
      !Number.isSafeInteger(shift.expectedCash.minor) ||
      !Number.isSafeInteger(shift.variance.minor)
    )
      throw new TypeError('Closed shift details are invalid')
    if (
      JSON.stringify(expected) !== JSON.stringify(shift.expectedCash) ||
      shift.variance.minor !== shift.countedCash.minor - expected.minor ||
      shift.variance.currency !== expected.currency
    )
      throw new TypeError('Shift close totals are invalid')
  } else if (
    shift.closedAt ||
    shift.closedBy ||
    shift.countedCash ||
    shift.expectedCash ||
    shift.variance
  )
    throw new TypeError('Open shift cannot contain closing details')
  return shift
}
export function openCashShift(input: {
  id: string
  branchId: string
  actorId: string
  actorRole: MembershipRole
  openedAt: string
  openingFloat: Money
}): CashShift {
  if (!['owner', 'admin', 'manager'].includes(input.actorRole))
    throw new TypeError('Shift opening requires manager approval')
  return validateCashShift({
    id: input.id,
    branchId: input.branchId,
    openedBy: input.actorId,
    openedAt: input.openedAt,
    openingFloat: input.openingFloat,
    movements: [],
    status: 'open',
    version: 1,
  })
}
export function addCashMovement(
  shift: CashShift,
  movement: CashMovement,
): CashShift {
  validateCashShift(shift)
  if (shift.status !== 'open') throw new TypeError('Closed shift cannot change')
  const updated = {
    ...shift,
    movements: [...shift.movements, movement],
    version: shift.version + 1,
  }
  return validateCashShift(updated)
}
export function closeCashShift(
  shift: CashShift,
  input: {
    actorId: string
    actorRole: MembershipRole
    closedAt: string
    countedCash: Money
  },
): CashShift {
  validateCashShift(shift)
  if (
    shift.status !== 'open' ||
    !['owner', 'admin', 'manager'].includes(input.actorRole)
  )
    throw new TypeError(
      'Shift closing requires an open shift and manager approval',
    )
  const expected = expectedDrawerCash(shift)
  return validateCashShift({
    ...shift,
    status: 'closed',
    closedBy: input.actorId,
    closedAt: input.closedAt,
    countedCash: input.countedCash,
    expectedCash: expected,
    variance: money(
      input.countedCash.minor - expected.minor,
      expected.currency,
    ),
    version: shift.version + 1,
  })
}
