import {
  ChatInputApplicationCommandData,
  Client,
  Collection,
  REST,
  Routes,
  APIApplicationCommand,
  RESTGetAPIApplicationGuildCommandsResult,
} from "discord.js"
import { ApplicationIntegrationType } from "discord-api-types/v10"
import { CommandConfig, RTTStation } from "./types.js"
import { loadStops } from "./rtt/stations.js"
import { config } from "dotenv"
import loadashpkg from "lodash"

const { isEqual } = loadashpkg

config()

function filterUndefinedProps<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>
}

type PutMethod = (commands: APIApplicationCommand[]) => Promise<unknown>
type AddMethod = (command: APIApplicationCommand) => Promise<unknown>
type RemoveMethod = (commandId: string) => Promise<unknown>
type EditMethod = (commandId: string, data: APIApplicationCommand) => Promise<unknown>

type ChangeMethods = {
  put: PutMethod
  add: AddMethod
  remove: RemoveMethod
  edit: EditMethod
}

export class WMTClient extends Client {
  commands: Collection<string, CommandConfig> = new Collection()

  stations: RTTStation[] = []

  rest = new REST().setToken(this.token)

  addCommand(command: CommandConfig) {
    this.commands.set(command.name, { ...command, data: command.data.setName(command.name) })
  }

  private getCommandChanges(
    commands: ChatInputApplicationCommandData[],
    current: APIApplicationCommand[]
  ) {
    const additions = commands.filter((cmd) => !current.find((c) => c.name === cmd.name))
    const removals = current.filter((cmd) => !commands.find((c) => c.name === cmd.name))
    const edits = commands
      .filter((cmd) => {
        const sameName = current.find((c) => c.name === cmd.name)
        if (!sameName) return false
        const sameProps = sameName.description === cmd.description

        const sameOptions = isEqual(
          sameName.options?.map((o) => filterUndefinedProps(o)),
          cmd.options?.map((o) => filterUndefinedProps(o))
        )

        return sameName && (!sameProps || !sameOptions)
      })
      .map((cmd) => {
        return {
          id: current.find((c) => c.name === cmd.name)?.id,
          name: cmd.name,
          description: cmd.description,
          options: cmd.options,
        }
      })

    console.log(`Additions: ${additions.length}`)
    console.log(`Removals: ${removals.length}`)
    console.log(`Edits: ${edits.length}`)

    return { additions, removals, edits }
  }

  private async applyChanges(
    { put, add, remove, edit }: ChangeMethods,
    commands,
    { additions, removals, edits }
  ) {
    if (additions.length + removals.length + edits.length > 3) {
      console.log("Bulk updating commands")
      await put(commands)
    } else {
      console.log("Individually updating commands")
      await Promise.all([
        ...additions.map(add),
        ...removals.map((cmd) => remove(cmd.id)),
        ...edits.map((cmd) => edit(cmd.id || "", cmd)),
      ])
    }
  }

  private async uploadGuildCommands(guildId: string, commands: ChatInputApplicationCommandData[]) {
    console.log(`Uploading commands to guild ${guildId}`)

    const current = (await this.rest.get(
      Routes.applicationGuildCommands(this.user?.id || "", guildId)
    )) as RESTGetAPIApplicationGuildCommandsResult

    console.log(`Currently there are ${current.length} commands`)

    const changes = this.getCommandChanges(commands, current)

    await this.applyChanges(
      {
        put: (commands) =>
          this.rest.put(Routes.applicationGuildCommands(this.user?.id || "", guildId), {
            body: commands,
          }),
        add: (command) =>
          this.rest.post(Routes.applicationGuildCommands(this.user?.id || "", guildId), {
            body: command,
          }),
        remove: (commandId) =>
          this.rest.delete(Routes.applicationGuildCommand(this.user?.id || "", guildId, commandId)),
        edit: (commandId, data) =>
          this.rest.patch(Routes.applicationGuildCommand(this.user?.id || "", guildId, commandId), {
            body: data,
          }),
      },
      commands,
      changes
    )
  }

  private async uploadGlobalCommands() {
    console.log("Uploading global commands")

    const enableUserUsage = (command: APIApplicationCommand) => ({
      ...command,
      integration_types: [
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall,
      ],
    })

    const current = (await this.rest.get(
      Routes.applicationCommands(this.user?.id || "")
    )) as APIApplicationCommand[]

    console.log(`Currently there are ${current.length} commands`)

    const changes = this.getCommandChanges(
      this.commands.map((cmd) => cmd.data.toJSON()) as ChatInputApplicationCommandData[],
      current
    )

    await this.applyChanges(
      {
        put: (commands) =>
          this.rest.put(Routes.applicationCommands(this.user?.id || ""), {
            body: commands.map(enableUserUsage),
          }),
        add: (command) =>
          this.rest.post(Routes.applicationCommands(this.user?.id || ""), {
            body: enableUserUsage(command),
          }),
        remove: (commandId) =>
          this.rest.delete(Routes.applicationCommand(this.user?.id || "", commandId)),
        edit: (commandId, data) =>
          this.rest.patch(Routes.applicationCommand(this.user?.id || "", commandId), {
            body: enableUserUsage(data),
          }),
      },
      this.commands.map((cmd) => cmd.data.toJSON()) as ChatInputApplicationCommandData[],
      changes
    )
  }

  async uploadCommands() {
    if (process.env.GUILDS) {
      // If the GUILDS env var is set, we upload the commands to the specified guilds
      const idsRegex = /(\[("\d{18,22}",)*"\d{18,22}"\])|(\[\])/

      if (!idsRegex.test(process.env.GUILDS)) {
        throw new Error("Invalid guilds array")
      }

      const guilds = JSON.parse(process.env.GUILDS) as string[]

      await Promise.all(
        guilds.map((id) =>
          this.uploadGuildCommands(
            id,
            this.commands.map((cmd) => cmd.data.toJSON()) as ChatInputApplicationCommandData[]
          )
        )
      )
    } else {
      // Otherwise, we upload the commands globally, for both guilds and users
      await this.uploadGlobalCommands()
    }
  }

  async fetchStations() {
    try {
      this.stations = await loadStops()
    } catch (err) {
      console.error("Failed to fetch station list", err)
      this.stations = []
    }
  }
}
