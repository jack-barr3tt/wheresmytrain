import { format, isMatch, isValid, parse } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { InvalidTimeError } from "../../rtt/errors.js"

export type QueryTime = {
  /** Clock time shown to the user, HH:mm */
  label: string
  /** Local datetime with no offset, so Realtime Trains uses the station's timezone */
  timeFrom: string
}

const TIME_ZONE = "Europe/London"

/** Colon times, then 12-hour colon times. Compact times are separate so 1430 is not read as 1:43. */
const COLON_FORMATS = ["H:mm", "h:mma", "h:mmaaaa"]
const COMPACT_FORMATS = ["HHmm", "Hmm", "ha", "haaaa"]

function formatsFor(value: string): string[] {
  return value.includes(":") ? COLON_FORMATS : COMPACT_FORMATS
}

function londonReference(now: Date): Date {
  const day = formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd")
  return parse(day, "yyyy-MM-dd", now)
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

  const reference = londonReference(now)
  for (const pattern of formatsFor(value)) {
    if (!isMatch(value, pattern)) {
      continue
    }

    const parsed = parse(value, pattern, reference)
    if (!isValid(parsed)) {
      continue
    }

    return {
      label: format(parsed, "HH:mm"),
      timeFrom: format(parsed, "yyyy-MM-dd'T'HH:mm:ss"),
    }
  }

  throw new InvalidTimeError()
}
