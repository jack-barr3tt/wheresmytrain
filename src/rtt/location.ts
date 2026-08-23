import {
  getGbNrLocation,
  type GetGbNrLocation200,
  type NetworkRailLocationLineUpObject,
} from "../generated/rtt.js"
import { cacheGet, cacheSet, locationCacheKey } from "./cache.js"

export type LocationResult = {
  locationName: string
  services: NetworkRailLocationLineUpObject[]
}

export type FetchLocationOptions = {
  includeRealtime?: boolean
}

function toResult(
  code: string,
  data?: GetGbNrLocation200 | null,
): LocationResult {
  return {
    locationName: data?.query?.location?.description ?? code,
    services: data?.services ?? [],
  }
}

function requestInit(includeRealtime: boolean): RequestInit | undefined {
  if (includeRealtime) {
    return undefined
  }

  return {
    headers: {
      Realtime: "false",
    },
  }
}

export async function fetchLocation(
  code: string,
  filterTo?: string,
  options: FetchLocationOptions = {},
): Promise<LocationResult> {
  const includeRealtime = options.includeRealtime ?? true
  const normalised = code.toUpperCase()
  const filter = filterTo?.toUpperCase()
  const key = locationCacheKey(normalised, filter, includeRealtime)
  const cached = cacheGet<LocationResult>(key)
  if (cached) {
    return cached
  }

  const response = await getGbNrLocation(
    {
      code: normalised,
      ...(filter ? { filterTo: filter } : {}),
    },
    requestInit(includeRealtime),
  )

  const result =
    response.status === 200
      ? toResult(normalised, response.data)
      : toResult(normalised)
  cacheSet(key, result)
  return result
}
