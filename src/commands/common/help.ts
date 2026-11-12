import { EmbedBuilder } from "discord.js"

export function helpCommon() {
  return new EmbedBuilder()
    .setTitle("Help")
    .setColor("#39bdb8")
    .setDescription(
      `Check UK train times without leaving Discord! Powered by [Realtime Trains](https://www.realtimetrains.co.uk/) :heart:`,
    )
    .addFields([
      {
        name: "Commands",
        value:
          "`/between` - Services between two stations. Optional `time` (14:30, 1430, or 2:30pm) uses today\n" +
          "`/at` - Services at a station. Optional `time` uses today\n" +
          "`,t <origin> <destination> [time]` - Same as `/between`, using CRS codes\n" +
          "`,a <station> [time]` - Same as `/at`, using a CRS code\n" +
          "`/help` - Get this help message\n",
      },
    ])
}
