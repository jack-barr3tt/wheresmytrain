import { SlashCommandBuilder } from "discord.js"
import type {
  APIChatInputApplicationCommandInteraction,
  APIApplicationCommandAutocompleteInteraction,
  APIInteractionResponse,
  APIApplicationCommandAutocompleteResponse,
} from "discord-api-types/v10"

export type CommandConfig = {
  name: string
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
  execute: (interaction: APIChatInputApplicationCommandInteraction) => Promise<APIInteractionResponse>
  autocomplete?: (interaction: APIApplicationCommandAutocompleteInteraction, stations: RTTStation[]) => Promise<APIApplicationCommandAutocompleteResponse>
}

export type RTTStation = {
  description: string
  crs: string
}