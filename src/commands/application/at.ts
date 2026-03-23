import { SlashCommandBuilder } from "discord.js"
import {
  InteractionResponseType,
  MessageFlags,
  type APIChatInputApplicationCommandInteraction,
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteractionDataStringOption,
  type APIInteractionResponse,
  type APIApplicationCommandAutocompleteResponse,
} from "discord-api-types/v10"
import { RTTStation } from "../../types.js"
import { stationAutocomplete } from "./autocomplete/station.js"
import { atCommon } from "../common/at.js"
import { error } from "../common/error.js"

export const at = {
  name: "at",
  data: new SlashCommandBuilder()
    .setDescription("See upcoming departures at a station")
    .addStringOption((option) =>
      option
        .setName("station")
        .setDescription("The station to see upcoming departures for")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  execute: async (interaction: APIChatInputApplicationCommandInteraction): Promise<APIInteractionResponse> => {
    const station = (
      interaction.data.options?.find((o) => o.name === "station") as
        | APIApplicationCommandInteractionDataStringOption
        | undefined
    )?.value ?? null

    try {
      const embed = await atCommon(station)

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { embeds: [embed.toJSON()] },
      }
    } catch (err) {
      if (err.message === "unknown error occurred")
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { embeds: [error("Invalid station!").toJSON()], flags: MessageFlags.Ephemeral },
        }

      console.error(err)
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          embeds: [error("There was an error trying to execute that command!").toJSON()],
          flags: MessageFlags.Ephemeral,
        },
      }
    }
  },
  autocomplete: async (interaction: APIApplicationCommandAutocompleteInteraction, stations: RTTStation[]): Promise<APIApplicationCommandAutocompleteResponse> => {
    const focused = interaction.data.options?.find((o) => "focused" in o && o.focused)
    const focusedValue = (focused && "value" in focused ? (focused.value as string) : "").toLowerCase()

    try {
      return {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: { choices: stationAutocomplete(focusedValue, stations) },
      }
    } catch (err) {
      console.error(err)
      return {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: { choices: [] },
      }
    }
  },
}
