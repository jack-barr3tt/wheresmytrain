import { InvalidTimeError } from "../../rtt/errors.js"

export type QueryTime = {
  /** Clock time shown to the user, HH:mm */
  label: string
  /** Local datetime with no offset, so Realtime Trains uses the station's timezone */
  timeFrom: string
}

function londonDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value
  const year = value("year")
  const month = value("month")
  const day = value("day")
  if (!year || !month || !day) {
    throw new InvalidTimeError()
  }
  return `${year}-${month}-${day}`
}

function toQueryTime(hours: number, minutes: number, now: Date): QueryTime {
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new InvalidTimeError()
  }

  const hh = String(hours).padStart(2, "0")
  const mm = String(minutes).padStart(2, "0")
  return {
    label: `${hh}:${mm}`,
    timeFrom: `${londonDate(now)}T${hh}:${mm}:00`,
  }
}

/**
 * Parse a clock time and attach today's London date.
 * Accepts 14:30, 14.30, 1430, 2:30pm, and 2pm. Empty input means "now".
 */
export function parseQueryTime(
  input: string | null | undefined,
  now = new Date(),
): QueryTime | undefined {
  if (input == null) {
    return undefined
  }

  const value = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/(\d)\.(\d)/g, "$1:$2")
  if (!value) {
    return undefined
  }

  const colon = value.match(/^(\d{1,2}):(\d{2})$/)
  if (colon) {
    return toQueryTime(Number(colon[1]), Number(colon[2]), now)
  }

  const compact = value.match(/^(\d{3,4})$/)
  if (compact) {
    const digits = compact[1]
    return toQueryTime(
      Number(digits.slice(0, -2)),
      Number(digits.slice(-2)),
      now,
    )
  }

  const twelveHour = value.match(/^(\d{1,2})(?::(\d{2}))?([ap])\.?m\.?$/)
  if (twelveHour) {
    let hours = Number(twelveHour[1])
    const minutes = twelveHour[2] ? Number(twelveHour[2]) : 0
    if (hours < 1 || hours > 12) {
      throw new InvalidTimeError()
    }
    if (twelveHour[3] === "a") {
      if (hours === 12) hours = 0
    } else if (hours !== 12) {
      hours += 12
    }
    return toQueryTime(hours, minutes, now)
  }

  throw new InvalidTimeError()
}
