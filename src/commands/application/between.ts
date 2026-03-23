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
import { betweenCommon } from "../common/between.js"
import { RTTStation } from "../../types.js"
import { stationAutocomplete } from "./autocomplete/station.js"
import { error } from "../common/error.js"

export const between = {
  name: "between",
  data: new SlashCommandBuilder()
    .setDescription("See the next 3 trains between two stations")
    .addStringOption((option) =>
      option
        .setName("origin")
        .setDescription("The station you will start your journey from")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("destination")
        .setDescription("The station you will end your journey at")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  execute: async (interaction: APIChatInputApplicationCommandInteraction): Promise<APIInteractionResponse> => {
    const origin = (
      interaction.data.options?.find((o) => o.name === "origin") as
        | APIApplicationCommandInteractionDataStringOption
        | undefined
    )?.value ?? null

    const destination = (
      interaction.data.options?.find((o) => o.name === "destination") as
        | APIApplicationCommandInteractionDataStringOption
        | undefined
    )?.value ?? null

    try {
      const embed = await betweenCommon(origin, destination)

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { embeds: [embed.toJSON()] },
      }
    } catch (err) {
      if (err.message === "unknown error occurred")
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { embeds: [error("Invalid station(s)!").toJSON()], flags: MessageFlags.Ephemeral },
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
