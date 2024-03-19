import { Logger } from 'pino'
import { Argv, Arguments } from 'yargs'
import { Config } from '../../config.js'
import { LuzzleDatabase } from '@luzzle/core'
import { Pieces } from '../../pieces/index.js'

export type Context = {
	db: LuzzleDatabase
	log: Logger
	pieces: Pieces
	directory: string
	config: Config
	flags: {
		dryRun: boolean
	}
}

export interface Command<U = Record<string, unknown>> {
	name: string
	command: string | ReadonlyArray<string>
	describe: string
	builder?: <T>(yargs: Argv<T>) => Argv<T & U>
	run: (ctx: Context, args: Arguments<U>) => Promise<void>
}
