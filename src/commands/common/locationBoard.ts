import type { NetworkRailLocationLineUpObject } from "../../generated/rtt.js"
import { fetchLocation, type LocationResult } from "../../rtt/location.js"
import { isPassengerService } from "./formatService.js"

export const BOARD_LIMIT = 5

function serviceIdentity(service: NetworkRailLocationLineUpObject) {
  const meta = service.scheduleMetadata
  if (meta?.uniqueIdentity) {
    return meta.uniqueIdentity
  }

  return `${meta?.namespace ?? "gb-nr"}:${meta?.identity ?? ""}:${meta?.departureDate ?? ""}`
}

function mergeServices(
  primary: NetworkRailLocationLineUpObject[],
  fallback: NetworkRailLocationLineUpObject[],
  limit: number,
) {
  const merged = [...primary]
  const seen = new Set(primary.map(serviceIdentity))

  for (const service of fallback) {
    if (merged.length >= limit) {
      break
    }

    const identity = serviceIdentity(service)
    if (seen.has(identity)) {
      continue
    }

    seen.add(identity)
    merged.push(service)
  }

  return merged.slice(0, limit)
}

export async function fetchLocationBoard(
  code: string,
  filterTo?: string,
  limit = BOARD_LIMIT,
): Promise<LocationResult> {
  const primary = await fetchLocation(code, filterTo, { includeRealtime: true })
  let services = primary.services.filter(isPassengerService)

  if (services.length < limit) {
    const fallback = await fetchLocation(code, filterTo, {
      includeRealtime: false,
    })
    services = mergeServices(
      services,
      fallback.services.filter(isPassengerService),
      limit,
    )
  }

  return {
    locationName: primary.locationName,
    services,
  }
}
