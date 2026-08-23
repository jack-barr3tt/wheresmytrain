import { fetchLocation, type LocationResult } from "../../rtt/location.js"
import { isPassengerService } from "./formatService.js"

export const BOARD_LIMIT = 5
export const BOARD_TIME_WINDOW_MINUTES = 5 * 60

export async function fetchLocationBoard(
  code: string,
  filterTo?: string,
  limit = BOARD_LIMIT,
): Promise<LocationResult> {
  const location = await fetchLocation(code, filterTo, {
    timeWindowMinutes: BOARD_TIME_WINDOW_MINUTES,
  })

  return {
    locationName: location.locationName,
    services: location.services.filter(isPassengerService).slice(0, limit),
  }
}
