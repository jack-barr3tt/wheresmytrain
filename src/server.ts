import express, { Request, Response } from "express"
import nacl from "tweetnacl"
import {
  InteractionType,
  InteractionResponseType,
  type APIChatInputApplicationCommandInteraction,
  type APIApplicationCommandAutocompleteInteraction,
} from "discord-api-types/v10"
import { WMTClient } from "./client.js"

export function createServer(client: WMTClient) {
  const app = express()

  // Use raw body parsing so the unmodified bytes are available for signature verification
  app.use(express.raw({ type: "application/json" }))

  app.post("/interactions", async (req: Request, res: Response) => {
    const signature = req.headers["x-signature-ed25519"] as string | undefined
    const timestamp = req.headers["x-signature-timestamp"] as string | undefined
    const rawBody = req.body as Buffer

    if (!signature || !timestamp) {
      res.status(401).json({ error: "Missing signature headers" })
      return
    }

    const message = Buffer.from(timestamp + rawBody.toString())
    const sig = Buffer.from(signature, "hex")
    const publicKey = Buffer.from(process.env.DISCORD_PUBLIC_KEY!, "hex")
    const isValid = nacl.sign.detached.verify(
      new Uint8Array(message),
      new Uint8Array(sig),
      new Uint8Array(publicKey)
    )

    if (!isValid) {
      res.status(401).json({ error: "Invalid request signature" })
      return
    }

    const interaction = JSON.parse(rawBody.toString())

    if (interaction.type === InteractionType.Ping) {
      res.json({ type: InteractionResponseType.Pong })
      return
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
      const command = client.commands.get(interaction.data.name)

      if (!command) {
        res.status(400).json({ error: "Unknown command" })
        return
      }

      try {
        const response = await command.execute(interaction as APIChatInputApplicationCommandInteraction)
        res.json(response)
      } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
      }

      return
    }

    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      const command = client.commands.get(interaction.data.name)

      if (!command?.autocomplete) {
        res.json({ type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } })
        return
      }

      try {
        const response = await command.autocomplete(
          interaction as APIApplicationCommandAutocompleteInteraction,
          client.stations
        )
        res.json(response)
      } catch (err) {
        console.error(err)
        res.json({ type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } })
      }

      return
    }

    res.status(400).json({ error: "Unknown interaction type" })
  })

  return app
}
