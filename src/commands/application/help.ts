import { SlashCommandBuilder } from "discord.js"
import { InteractionResponseType } from "discord-api-types/v10"
import type {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
} from "discord-api-types/v10"
import { helpCommon } from "../common/help.js"

export const help = {
  name: "help",
  data: new SlashCommandBuilder().setDescription("Get help with using the bot"),
  execute: async (_interaction: APIChatInputApplicationCommandInteraction): Promise<APIInteractionResponse> => ({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { embeds: [helpCommon().toJSON()] },
  }),
}
