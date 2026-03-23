import { GatewayIntentBits } from "discord.js"
import { config } from "dotenv"
import Upcoming from "./commands/text/between.js"
import { WMTClient } from "./client.js"
import { importCommands } from "./commands/slashCommands.js"
import At from "./commands/text/at.js"
import Help from "./commands/text/help.js"
import { createServer } from "./server.js"

// Get environment variables from .env file
config()

const client = new WMTClient({
  intents: [
    // Intents needed to get messages in guilds
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.on("ready", async () => {
  console.log("Importing commands...")
  importCommands(client)

  console.log("Uploading commands...")
  await client.uploadCommands()

  console.log("Fetching stations...")
  await client.fetchStations()

  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
  createServer(client).listen(port, () => {
    console.log(`Listening for interactions on port ${port}`)
  })

  console.log("Ready!")
})

client.on("messageCreate", async (message) => {
  // Using comma as prefix
  const PREFIX = ","
  if (!message.content.startsWith(PREFIX)) return

  const [CMD_NAME, ...args] = message.content.trim().substring(PREFIX.length).split(/\s+/)

  try {
    switch (CMD_NAME) {
      case "t":
        await Upcoming(message, args)
        break
      case "a":
        await At(message, args)
        break
      case "help":
        await Help(message)
        break
    }
  } catch (err) {
    console.error(err)
    await message.reply("There was an error trying to execute that command!")
  }
})

client.login(process.env.DISCORD_TOKEN)
