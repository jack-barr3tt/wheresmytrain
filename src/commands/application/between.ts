import { SlashCommandBuilder } from "discord.js"
import {
  InteractionResponseType,
  type APIChatInputApplicationCommandInteraction,
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteractionDataStringOption,
  type APIInteractionResponse,
  type APIApplicationCommandAutocompleteResponse,
} from "discord-api-types/v10"
import { betweenCommon } from "../common/between.js"
import { RTTStation } from "../../types.js"
import { stationAutocomplete } from "./autocomplete/station.js"
import { slashFailureResponse } from "../common/error.js"
import { parseQueryTime } from "../common/queryTime.js"

export const between = {
  name: "between",
  data: new SlashCommandBuilder()
    .setDescription("See the next 3 trains between two stations")
    .addStringOption((option) =>
      option
        .setName("origin")
        .setDescription("The station you will start your journey from")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("destination")
        .setDescription("The station you will end your journey at")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription(
          "Optional time today to search from, such as 14:30, 1430, or 2:30pm",
        )
        .setRequired(false),
    ),
  execute: async (
    interaction: APIChatInputApplicationCommandInteraction,
  ): Promise<APIInteractionResponse> => {
    const origin =
      (
        interaction.data.options?.find((o) => o.name === "origin") as
          APIApplicationCommandInteractionDataStringOption | undefined
      )?.value ?? null

    const destination =
      (
        interaction.data.options?.find((o) => o.name === "destination") as
          APIApplicationCommandInteractionDataStringOption | undefined
      )?.value ?? null

    const time = (
      interaction.data.options?.find((o) => o.name === "time") as
        APIApplicationCommandInteractionDataStringOption | undefined
    )?.value

    try {
      const embed = await betweenCommon(
        origin,
        destination,
        parseQueryTime(time),
      )

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { embeds: [embed.toJSON()] },
      }
    } catch (err) {
      return slashFailureResponse(err)
    }
  },
  autocomplete: async (
    interaction: APIApplicationCommandAutocompleteInteraction,
    stations: RTTStation[],
  ): Promise<APIApplicationCommandAutocompleteResponse> => {
    const focused = interaction.data.options?.find(
      (o) => "focused" in o && o.focused,
    )
    if (
      !focused ||
      (focused.name !== "origin" && focused.name !== "destination")
    ) {
      return {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: { choices: [] },
      }
    }
    const focusedValue = (
      focused && "value" in focused ? (focused.value as string) : ""
    ).toLowerCase()

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
