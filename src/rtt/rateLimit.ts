import { RateLimitedError } from "./errors.js"

const MINUTE_REMAINING_HEADER = "x-ratelimit-remaining-minute"
const RETRY_AFTER_HEADER = "retry-after"

let remaining: number | null = null
let retryAtMs = 0

export function recordFromHeaders(headers: Headers, status: number) {
  const remainingHeader = headers.get(MINUTE_REMAINING_HEADER)
  if (remainingHeader !== null) {
    const parsed = Number.parseInt(remainingHeader, 10)
    if (!Number.isNaN(parsed)) {
      remaining = parsed
    }
  }

  const retryAfter = headers.get(RETRY_AFTER_HEADER)
  if (retryAfter !== null) {
    const seconds = Number.parseInt(retryAfter, 10)
    if (!Number.isNaN(seconds)) {
      retryAtMs = Date.now() + seconds * 1000
    }
  } else if (status === 429 || remaining === 0) {
    retryAtMs = Math.max(retryAtMs, Date.now() + 60_000)
  }
}

export function getRetryAfterSeconds() {
  return Math.max(1, Math.ceil((retryAtMs - Date.now()) / 1000))
}

export function assertCanRequest() {
  if (remaining === 0 && Date.now() < retryAtMs) {
    throw new RateLimitedError(getRetryAfterSeconds())
  }
}
