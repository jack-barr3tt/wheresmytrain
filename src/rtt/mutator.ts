import {
  InvalidQueryError,
  RateLimitedError,
  RttUnavailableError,
} from "./errors.js"
import {
  assertCanRequest,
  getRetryAfterSeconds,
  recordFromHeaders,
} from "./rateLimit.js"
import {
  getAccessToken,
  getRefreshToken,
  runRefreshHandler,
} from "./tokenStore.js"

const API_VERSION = "2026-07-25"

type RttFetchResponse<T> = {
  data: T
  status: number
  headers: Headers
}

function isRefreshRequest(url: string) {
  return url.includes("/api/get_access_token")
}

function errorFromStatus(status: number): never {
  if (status === 400) {
    throw new InvalidQueryError()
  }
  if (status === 429) {
    throw new RateLimitedError(getRetryAfterSeconds())
  }
  throw new RttUnavailableError(status)
}

async function parseBody(response: Response) {
  if ([204, 205, 304].includes(response.status)) {
    return null
  }

  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function send(url: string, options: RequestInit, token: string) {
  const headers = new Headers(options.headers)
  headers.set("Authorization", `Bearer ${token}`)
  headers.set("Version", API_VERSION)
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json")
  }

  try {
    return await fetch(url, { ...options, headers })
  } catch (cause) {
    throw new RttUnavailableError(undefined, cause)
  }
}

export async function rttFetch<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const refresh = isRefreshRequest(url)
  if (!refresh) {
    assertCanRequest()
  }

  let token = refresh ? getRefreshToken() : getAccessToken()
  if (!token) {
    throw new RttUnavailableError()
  }

  let response = await send(url, options, token)
  recordFromHeaders(response.headers, response.status)

  if (response.status === 401 && !refresh) {
    await runRefreshHandler()
    token = getAccessToken()
    if (!token) {
      throw new RttUnavailableError(401)
    }
    response = await send(url, options, token)
    recordFromHeaders(response.headers, response.status)
  }

  const data = await parseBody(response)

  if (!response.ok) {
    errorFromStatus(response.status)
  }

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as RttFetchResponse<unknown> as T
}
