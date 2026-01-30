import { buildSalesReport, type SalesReport } from '@cafepos/domain'

import { businessDayRange, shiftBusinessDate } from './business-time'
import { type SaleHistory } from './history-storage'

export type WeeklySalesComparison = Readonly<{
  current: SalesReport
  previous: SalesReport
  comparisonDate: string
  differenceMinor: number
  percentChange: number | null
}>

export function buildWeeklySalesComparison(
  history: SaleHistory,
  date: string,
  timezone: string,
) {
  const currentRange = businessDayRange(date, timezone)
  const comparisonDate = shiftBusinessDate(date, -7)
  const previousRange = businessDayRange(comparisonDate, timezone)
  const current = buildSalesReport(
    history.receipts,
    history.refunds,
    currentRange,
  )
  const previous = buildSalesReport(
    history.receipts,
    history.refunds,
    previousRange,
  )
  const differenceMinor = current.netMinor - previous.netMinor
  const percentChange =
    previous.netMinor === 0 ? null : (differenceMinor / previous.netMinor) * 100
  return {
    current,
    previous,
    comparisonDate,
    differenceMinor,
    percentChange,
  } satisfies WeeklySalesComparison
}
