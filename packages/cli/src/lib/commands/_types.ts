import { PrismaClient } from '../prisma'
import { Config } from '../config'
import { Logger } from 'pino'
import { ArgumentsCamelCase, Argv } from 'yargs'

export type Context = {
  prisma: PrismaClient
  log: Logger
  directory: string
  config: Config
  flags: {
    force: boolean
    dryRun: boolean
    verbose: boolean
  }
}

export interface Command<U = Record<string, unknown>> {
  name: string
  command: string | ReadonlyArray<string>
  describe: string
  builder?: <T>(yargs: Argv<T>) => Argv<T>
  run:
    | ((ctx: Context, args: ArgumentsCamelCase<U>) => void | Promise<void>)
    | ((ctx: Context) => void | Promise<void>)
}
