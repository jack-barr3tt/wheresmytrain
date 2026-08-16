import { getApiGetAccessToken } from "../generated/rtt.js"
import { RttUnavailableError } from "./errors.js"
import { getValidUntilMs, setAccessToken, setRefreshHandler } from "./tokenStore.js"

const REFRESH_SKEW_MS = 60_000

let inFlight: Promise<void> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

async function doRefresh() {
  const response = await getApiGetAccessToken()
  const token = response.data.token
  const validUntil = response.data.validUntil
  if (!token || !validUntil) {
    throw new RttUnavailableError()
  }
  setAccessToken(token, validUntil)
  scheduleRefresh()
}

export async function refreshAccessToken() {
  if (inFlight) {
    return inFlight
  }
  inFlight = doRefresh().finally(() => {
    inFlight = null
  })
  return inFlight
}

function scheduleRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }

  const delay = Math.max(5_000, getValidUntilMs() - Date.now() - REFRESH_SKEW_MS)
  refreshTimer = setTimeout(() => {
    refreshAccessToken().catch((err) => {
      console.error("Failed to refresh RTT access token", err)
    })
  }, delay)
  refreshTimer.unref?.()
}

export async function initRttAuth() {
  setRefreshHandler(refreshAccessToken)
  await refreshAccessToken()
}
