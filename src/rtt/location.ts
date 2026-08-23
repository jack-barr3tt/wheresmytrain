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

function toResult(
  code: string,
  data?: GetGbNrLocation200 | null,
): LocationResult {
  return {
    locationName: data?.query?.location?.description ?? code,
    services: data?.services ?? [],
  }
}

export async function fetchLocation(
  code: string,
  filterTo?: string,
): Promise<LocationResult> {
  const normalised = code.toUpperCase()
  const filter = filterTo?.toUpperCase()
  const key = locationCacheKey(normalised, filter)
  const cached = cacheGet<LocationResult>(key)
  if (cached) {
    return cached
  }

  const response = await getGbNrLocation({
    code: normalised,
    ...(filter ? { filterTo: filter } : {}),
    timeWindow: 300,
  })

  const result =
    response.status === 200
      ? toResult(normalised, response.data)
      : toResult(normalised)
  cacheSet(key, result)
  return result
}
