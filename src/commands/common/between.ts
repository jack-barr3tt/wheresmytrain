import { EmbedBuilder } from "discord.js"
import { InvalidQueryError } from "../../rtt/errors.js"
import { fetchLocation } from "../../rtt/location.js"
import { stationName } from "../../rtt/stations.js"
import { formatServiceLine, isPassengerService } from "./formatService.js"

export async function betweenCommon(
  originCRS: string | null,
  destinationCRS: string | null,
) {
  if (!originCRS || !destinationCRS) {
    throw new InvalidQueryError()
  }

  const origin = await fetchLocation(originCRS, destinationCRS)
  const destination = stationName(destinationCRS)
  const lines = origin.services
    .filter(isPassengerService)
    .slice(0, 3)
    .map((service) => formatServiceLine(service, { includeDestination: false }))
    .filter((line): line is string => Boolean(line))

  return new EmbedBuilder()
    .setTitle(`${origin.locationName} to ${destination}`)
    .setColor("#39bdb8")
    .setDescription(
      lines.length > 0 ? lines.join("\n") : "No trains found in the next hour.",
    )
}
