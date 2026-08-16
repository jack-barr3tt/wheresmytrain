import { RTTStation } from "../../../types.js"

export function stationAutocomplete(value: string, stations: RTTStation[]) {
  const descStartsWith = stations.filter((station) =>
    station.description.toLowerCase().startsWith(value),
  )
  const crsStartsWith =
    value.length > 3
      ? []
      : stations.filter((station) =>
          station.crs.toLowerCase().startsWith(value),
        )

  const options = Array.from(
    new Set(
      value.length === 3
        ? [...crsStartsWith, ...descStartsWith]
        : [...descStartsWith, ...crsStartsWith],
    ),
  )

  return options
    .map((station) => ({
      name: `${station.description} (${station.crs.toUpperCase()})`,
      value: station.crs,
    }))
    .slice(0, 25)
}
