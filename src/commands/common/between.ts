import { EmbedBuilder } from "discord.js"
import { InvalidQueryError } from "../../rtt/errors.js"
import { fetchLocation } from "../../rtt/location.js"
import { stationName } from "../../rtt/stations.js"
import { formatServiceLine, isPassengerService } from "./formatService.js"
import type { QueryTime } from "./queryTime.js"

export async function betweenCommon(
  originCRS: string | null,
  destinationCRS: string | null,
  time?: QueryTime,
) {
  if (!originCRS || !destinationCRS) {
    throw new InvalidQueryError()
  }

  const origin = await fetchLocation(originCRS, destinationCRS, time?.timeFrom)
  const destination = stationName(destinationCRS)
  const lines = origin.services
    .filter(isPassengerService)
    .slice(0, 5)
    .map((service) => formatServiceLine(service, { includeDestination: false }))
    .filter((line): line is string => Boolean(line))

  const title = time
    ? `${origin.locationName} to ${destination} from ${time.label}`
    : `${origin.locationName} to ${destination}`

  return new EmbedBuilder()
    .setTitle(title)
    .setColor("#39bdb8")
    .setDescription(
      lines.length > 0
        ? lines.join("\n")
        : time
          ? `No trains found in the 5 hours from ${time.label}.`
          : "No trains found in the next 5 hours.",
    )
}
