import { differenceInMinutes, format } from "date-fns"
import { EmbedBuilder } from "discord.js"
import { RTTClient } from "rttapi"
import tocEmoji from "./emojis.js"

export async function betweenCommon(originCRS: string, destinationCRS: string) {
  // Realtime Trains API client
  const rttClient = new RTTClient(process.env.RTT_USERNAME, process.env.RTT_PASSWORD)

  // Get origin and destination stations
  const [origin, destination] = await Promise.all([
    rttClient.locations.between(originCRS, destinationCRS),
    rttClient.locations.at(destinationCRS),
  ])

  // Use services at origin station to get detailed info about next 3 services
  const services = await Promise.all(
    origin.services
      .filter((_, i) => i < 3)
      .map(async (service) => await rttClient.service.get(service.serviceUid, service.runDate))
  )

  // Get info about when each service stops at the origin station
  const originStops = services.map((service) => ({
    service,
    stop: service.locations.find((stop) => stop.crs.toLowerCase() === originCRS.toLowerCase()),
  }))

  return new EmbedBuilder()
    .setTitle(`${origin.location.name} to ${destination.location.name}`)
    .setColor("#39bdb8")
    .setDescription(
      originStops
        .map(({ service, stop }) => {
          // Trains at their origin won't have an arrival time, only a departure time
          const realtime = stop.realtimeArrival || stop.realtimeDeparture
          const booked = stop.gbttBookedArrival || stop.gbttBookedDeparture

          // How late the train is
          const lateness = !realtime || !booked ? 0 : differenceInMinutes(realtime, booked)

          // Format realtime departure
          const formattedTime = realtime ? format(realtime, "HH:mm") : format(booked, "HH:mm")

          const rttLink = `https://www.realtimetrains.co.uk/service/gb-nr:${
            service.serviceUid
          }/${format(booked, "yyyy-MM-dd")}`

          // Platform info
          const platformInfo = stop.platform ? `Platform: ${stop.platform}` : ""

          // Operator emoji
          const operatorInfo = tocEmoji(service.atocCode) ? `${tocEmoji(service.atocCode)} ` : ""

          // Return formatted string
          if (lateness < 0)
            return `${operatorInfo}:blue_circle: [${formattedTime}](${rttLink}) (${lateness}) ${platformInfo}`
          if (lateness > 0)
            return `${operatorInfo}:red_circle: [${formattedTime}](${rttLink}) (+${lateness}) ${platformInfo}`
          return `${operatorInfo}:green_circle: [${formattedTime}](${rttLink}) ${platformInfo}`
        })
        .join("\n")
    )
}
