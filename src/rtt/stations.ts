import { getDataStops } from "../generated/rtt.js"
import type { RTTStation } from "../types.js"

let stations: RTTStation[] = []

export async function loadStops(): Promise<RTTStation[]> {
  const response = await getDataStops()
  const seen = new Set<string>()
  const mapped: RTTStation[] = []

  for (const stop of response.data.stops ?? []) {
    const crs = stop.shortCode?.trim()
    const description = stop.description?.trim()
    if (!crs || !description) {
      continue
    }

    const key = crs.toUpperCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    mapped.push({ description, crs: crs.toLowerCase() })
  }

  stations = mapped
  return mapped
}

export function stationName(crs: string) {
  const found = stations.find(
    (station) => station.crs.toLowerCase() === crs.toLowerCase(),
  )
  return found?.description ?? crs.toUpperCase()
}
