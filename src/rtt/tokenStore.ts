import { RttUnavailableError } from "./errors.js"

let accessToken: string | null = null
let validUntilMs = 0
let refreshHandler: (() => Promise<void>) | null = null

export function getRefreshToken() {
  const token = process.env.RTT_REFRESH_TOKEN
  if (!token) {
    throw new Error("RTT_REFRESH_TOKEN is not set")
  }
  return token
}

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string, validUntil: string | Date) {
  accessToken = token
  validUntilMs = new Date(validUntil).getTime()
}

export function getValidUntilMs() {
  return validUntilMs
}

export function setRefreshHandler(handler: () => Promise<void>) {
  refreshHandler = handler
}

export async function runRefreshHandler() {
  if (!refreshHandler) {
    throw new RttUnavailableError(401)
  }
  await refreshHandler()
}
