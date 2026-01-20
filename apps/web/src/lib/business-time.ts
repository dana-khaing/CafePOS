const partsInTimezone = (instant: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]))
}

export const dateInTimezone = (instant: Date, timeZone: string) => {
  const parts = partsInTimezone(instant, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

const midnightInTimezone = (date: string, timeZone: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new TypeError('Business date is invalid')
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const target = Date.UTC(year, month - 1, day)
  let instant = target
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = partsInTimezone(new Date(instant), timeZone)
    const shown = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    )
    instant += target - shown
  }
  return new Date(instant)
}

export const businessDayRange = (date: string, timeZone: string) => {
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10)
  return {
    from: midnightInTimezone(date, timeZone).toISOString(),
    to: midnightInTimezone(nextDate, timeZone).toISOString(),
  }
}
