import { differenceInMinutes, format } from "date-fns"
import type { IndividualTemporalData, NetworkRailLocationLineUpObject } from "../../generated/rtt.js"
import tocEmoji from "./emojis.js"

export function isPassengerService(service: NetworkRailLocationLineUpObject) {
  return service.scheduleMetadata?.inPassengerService !== false
}

function parseTime(value?: string) {
  if (!value) {
    return undefined
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function activityTimes(service: NetworkRailLocationLineUpObject) {
  const temporal: IndividualTemporalData | undefined =
    service.temporalData?.departure ?? service.temporalData?.arrival
  const realtime = parseTime(
    temporal?.realtimeActual ?? temporal?.realtimeForecast ?? temporal?.realtimeEstimate
  )
  const booked = parseTime(temporal?.scheduleAdvertised)
  const lateness =
    temporal?.realtimeAdvertisedLateness ??
    (realtime && booked ? differenceInMinutes(realtime, booked) : 0)

  return { display: realtime ?? booked, booked, lateness }
}

export function formatServiceLine(
  service: NetworkRailLocationLineUpObject,
  options: { includeDestination: boolean }
) {
  const { display, booked, lateness } = activityTimes(service)
  if (!display) {
    return null
  }

  const formattedTime = format(display, "HH:mm")
  const meta = service.scheduleMetadata
  const namespace = meta?.namespace ?? "gb-nr"
  const identity = meta?.identity
  const departureDate = meta?.departureDate ?? format(booked ?? display, "yyyy-MM-dd")
  const rttLink = identity
    ? `https://www.realtimetrains.co.uk/service/${namespace}:${identity}/${departureDate}`
    : null

  const platform =
    service.locationMetadata?.platform?.actual ?? service.locationMetadata?.platform?.planned
  const platformInfo = platform
    ? options.includeDestination
      ? `- Platform: ${platform}`
      : `Platform: ${platform}`
    : ""

  const destinationInfo = options.includeDestination
    ? (service.destination ?? [])
        .map((destination) => destination.location?.description)
        .filter((description): description is string => Boolean(description))
        .join(" & ")
    : ""

  const operatorCode = meta?.operator?.code
  const operatorInfo = operatorCode && tocEmoji(operatorCode) ? `${tocEmoji(operatorCode)} ` : ""
  const timeBit = rttLink ? `[${formattedTime}](${rttLink})` : formattedTime
  const latenessBit = lateness < 0 ? ` (${lateness})` : lateness > 0 ? ` (+${lateness})` : ""
  const destBit = destinationInfo ? ` ${destinationInfo}` : ""
  const platBit = platformInfo ? ` ${platformInfo}` : ""

  if (lateness < 0) {
    return `${operatorInfo}:blue_circle: ${timeBit}${latenessBit}${destBit}${platBit}`
  }
  if (lateness > 0) {
    return `${operatorInfo}:red_circle: ${timeBit}${latenessBit}${destBit}${platBit}`
  }
  return `${operatorInfo}:green_circle: ${timeBit}${destBit}${platBit}`
}
