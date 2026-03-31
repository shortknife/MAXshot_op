const TIME_ZONE = 'Asia/Shanghai'

type DateParts = { year: number; month: number; day: number }
export type RelativeTimeSlots = {
  time_window_days?: number
  date_from?: string
  date_to?: string
  exact_day?: string
  calendar_year?: number
  calendar_month?: number
  timezone: string
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function iso(parts: DateParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function getLocalParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value || '0')
  const month = Number(parts.find((part) => part.type === 'month')?.value || '0')
  const day = Number(parts.find((part) => part.type === 'day')?.value || '0')
  return { year, month, day }
}

function toDate(parts: DateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0))
}

function addDays(parts: DateParts, delta: number): DateParts {
  const date = toDate(parts)
  date.setUTCDate(date.getUTCDate() + delta)
  return getLocalParts(date)
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate()
}

function currentLocalParts(now = new Date()) {
  return getLocalParts(now)
}

function dayOfWeekMondayFirst(parts: DateParts) {
  const day = toDate(parts).getUTCDay()
  return day === 0 ? 7 : day
}

export function extractRelativeTimeSlots(raw: string, now = new Date()): RelativeTimeSlots | null {
  const text = String(raw || '').trim().toLowerCase()
  if (!text) return null

  const today = currentLocalParts(now)

  let match = text.match(/最近\s*(\d+)\s*(天|周|个月|月|年)|(?:过去|last)\s*(\d+)\s*(day|days|week|weeks|month|months|year|years)/i)
  if (match) {
    const count = Number(match[1] || match[3])
    const unitRaw = String(match[2] || match[4] || '').toLowerCase()
    if (Number.isFinite(count) && count > 0) {
      let days = count
      if (/(周|week)/.test(unitRaw)) days = count * 7
      else if (/(个月|月|month)/.test(unitRaw)) days = count * 30
      else if (/(年|year)/.test(unitRaw)) days = count * 365
      const from = addDays(today, -(days - 1))
      return {
        time_window_days: days,
        date_from: iso(from),
        date_to: iso(today),
        timezone: TIME_ZONE,
      }
    }
  }

  if (/(今天|today)/.test(text)) {
    const current = iso(today)
    return { time_window_days: 1, exact_day: current, date_from: current, date_to: current, timezone: TIME_ZONE }
  }

  if (/(昨天|昨日|yesterday)/.test(text)) {
    const value = iso(addDays(today, -1))
    return { exact_day: value, date_from: value, date_to: value, timezone: TIME_ZONE }
  }

  if (/(本周|this week)/.test(text)) {
    const offset = dayOfWeekMondayFirst(today) - 1
    const start = addDays(today, -offset)
    return {
      date_from: iso(start),
      date_to: iso(today),
      timezone: TIME_ZONE,
    }
  }

  if (/(上周|last week)/.test(text)) {
    const offset = dayOfWeekMondayFirst(today) - 1
    const startOfThisWeek = addDays(today, -offset)
    const startOfLastWeek = addDays(startOfThisWeek, -7)
    const endOfLastWeek = addDays(startOfThisWeek, -1)
    return {
      date_from: iso(startOfLastWeek),
      date_to: iso(endOfLastWeek),
      timezone: TIME_ZONE,
    }
  }

  if (/(本月|this month)/.test(text)) {
    return {
      calendar_year: today.year,
      calendar_month: today.month,
      date_from: iso({ year: today.year, month: today.month, day: 1 }),
      date_to: iso(today),
      timezone: TIME_ZONE,
    }
  }

  if (/(上月|last month)/.test(text)) {
    const month = today.month === 1 ? 12 : today.month - 1
    const year = today.month === 1 ? today.year - 1 : today.year
    return {
      calendar_year: year,
      calendar_month: month,
      date_from: iso({ year, month, day: 1 }),
      date_to: iso({ year, month, day: daysInMonth(year, month) }),
      timezone: TIME_ZONE,
    }
  }

  match = text.match(/(\d+)\s*(天|day|days)前/i)
  if (match) {
    const count = Number(match[1])
    if (Number.isFinite(count) && count > 0) {
      const value = iso(addDays(today, -count))
      return { exact_day: value, date_from: value, date_to: value, timezone: TIME_ZONE }
    }
  }

  return null
}
