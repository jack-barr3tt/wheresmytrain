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
          "`/between` - Check times for services between two stations\n" +
          "`/at` - Check times for services passing through a station\n" +
          "`/help` - Get this help message\n",
      },
    ])
}
