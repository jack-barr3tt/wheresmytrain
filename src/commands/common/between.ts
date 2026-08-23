import { EmbedBuilder } from "discord.js"
import { InvalidQueryError } from "../../rtt/errors.js"
import { stationName } from "../../rtt/stations.js"
import { fetchLocationBoard } from "./locationBoard.js"
import { formatServiceLine } from "./formatService.js"

export async function betweenCommon(
  originCRS: string | null,
  destinationCRS: string | null,
) {
  if (!originCRS || !destinationCRS) {
    throw new InvalidQueryError()
  }

  const origin = await fetchLocationBoard(originCRS, destinationCRS)
  const destination = stationName(destinationCRS)
  const lines = origin.services
    .map((service) => formatServiceLine(service, { includeDestination: false }))
    .filter((line): line is string => Boolean(line))

  return new EmbedBuilder()
    .setTitle(`${origin.locationName} to ${destination}`)
    .setColor("#39bdb8")
    .setDescription(
      lines.length > 0
        ? lines.join("\n")
        : "No trains found in the next 5 hours.",
    )
}
