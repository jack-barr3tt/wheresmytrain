const TTL_MS = 30_000

type CacheEntry<T> = {
  expiresAt: number
  value: T
}

const cache = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) {
    return undefined
  }
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.value as T
}

export function cacheSet<T>(key: string, value: T) {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS })
}

export function locationCacheKey(code: string, filterTo?: string) {
  return `location:${code.toUpperCase()}:${filterTo?.toUpperCase() ?? ""}`
}
