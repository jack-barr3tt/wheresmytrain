import { EmbedBuilder } from "discord.js"
import {
  InteractionResponseType,
  MessageFlags,
  type APIInteractionResponse,
} from "discord-api-types/v10"
import { InvalidQueryError, RateLimitedError, RttUnavailableError } from "../../rtt/errors.js"

export function error(message: string) {
  return new EmbedBuilder().setColor("#ff0000").setDescription(message)
}

export function commandFailure(err: unknown): { embed: EmbedBuilder; ephemeral: boolean } {
  if (err instanceof InvalidQueryError) {
    return {
      embed: error("That isn't a valid station. Try a name or CRS code."),
      ephemeral: true,
    }
  }
  if (err instanceof RateLimitedError) {
    return {
      embed: error(
        `Realtime Trains rate limit hit. Try again in ${err.retryAfterSeconds}s.`
      ),
      ephemeral: true,
    }
  }
  if (err instanceof RttUnavailableError) {
    return {
      embed: error("Couldn't reach Realtime Trains right now. Try again later."),
      ephemeral: true,
    }
  }

  console.error(err)
  return {
    embed: error("Something went wrong looking up trains."),
    ephemeral: true,
  }
}

export function slashFailureResponse(err: unknown): APIInteractionResponse {
  const { embed, ephemeral } = commandFailure(err)
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: [embed.toJSON()],
      ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    },
  }
}
