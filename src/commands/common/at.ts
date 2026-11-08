import { EmbedBuilder } from "discord.js"
import { InvalidQueryError } from "../../rtt/errors.js"
import { fetchLocation } from "../../rtt/location.js"
import {
  compareByRealtimeDeparture,
  formatServiceLine,
  isPassengerService,
} from "./formatService.js"
import type { QueryTime } from "./queryTime.js"

export async function atCommon(stationCRS: string | null, time?: QueryTime) {
  if (!stationCRS) {
    throw new InvalidQueryError()
  }

  const station = await fetchLocation(stationCRS, undefined, time?.timeFrom)
  const lines = station.services
    .filter(isPassengerService)
    .sort(compareByRealtimeDeparture)
    .slice(0, 5)
    .map((service) => formatServiceLine(service, { includeDestination: true }))
    .filter((line): line is string => Boolean(line))

  return new EmbedBuilder()
    .setTitle(
      time
        ? `Trains from ${station.locationName} from ${time.label}`
        : `Next trains from ${station.locationName}`,
    )
    .setColor("#39bdb8")
    .setDescription(
      lines.length > 0
        ? lines.join("\n")
        : time
          ? `No trains found in the 5 hours from ${time.label}.`
          : "No trains found in the next 5 hours.",
    )
}
