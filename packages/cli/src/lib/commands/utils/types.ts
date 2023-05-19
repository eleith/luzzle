import { Logger } from 'pino'
import { ArgumentsCamelCase, Argv } from 'yargs'
import { PrismaClient } from '../../prisma'
import { Config } from '../../config'

export type Context = {
  prisma: PrismaClient
  log: Logger
  directory: string
  config: Config
  flags: {
    dryRun: boolean
    verbose: boolean
  }
}

export interface Command<U = Record<string, unknown>> {
  name: string
  command: string | ReadonlyArray<string>
  describe: string
  builder?: <T>(yargs: Argv<T>) => Argv<T & U>
  run: (ctx: Context, args: ArgumentsCamelCase<U>) => Promise<void>
}
