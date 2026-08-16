import { EmbedBuilder } from "discord.js"
import { InvalidQueryError } from "../../rtt/errors.js"
import { fetchLocation } from "../../rtt/location.js"
import { formatServiceLine, isPassengerService } from "./formatService.js"

export async function atCommon(stationCRS: string | null) {
  if (!stationCRS) {
    throw new InvalidQueryError()
  }

  const station = await fetchLocation(stationCRS)
  const lines = station.services
    .filter(isPassengerService)
    .slice(0, 5)
    .map((service) => formatServiceLine(service, { includeDestination: true }))
    .filter((line): line is string => Boolean(line))

  return new EmbedBuilder()
    .setTitle(`Next trains from ${station.locationName}`)
    .setColor("#39bdb8")
    .setDescription(
      lines.length > 0 ? lines.join("\n") : "No trains found in the next hour.",
    )
}
