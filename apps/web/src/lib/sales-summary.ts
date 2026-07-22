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

export type DailySalesSummary = Readonly<{
  date: string
  report: SalesReport
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

export function buildDailySalesSummaries(
  history: SaleHistory,
  date: string,
  timezone: string,
  days = 14,
) {
  if (!Number.isInteger(days) || days <= 0)
    throw new TypeError('Daily sales summary length is invalid')
  return Array.from({ length: days }, (_, index) => {
    const currentDate = shiftBusinessDate(date, index - (days - 1))
    const range = businessDayRange(currentDate, timezone)
    return {
      date: currentDate,
      report: buildSalesReport(history.receipts, history.refunds, range),
    } satisfies DailySalesSummary
  })
}
