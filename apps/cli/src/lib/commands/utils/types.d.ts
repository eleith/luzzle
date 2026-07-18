import type { Logger } from 'pino'
import type { Argv, Arguments } from 'yargs'
import type { Config } from '../../config.js'
import type { LuzzleDatabase, Pieces, LuzzleStorage } from '@luzzle/core'

export type Context = {
	db: LuzzleDatabase
	log: Logger
	pieces: Pieces
	config: Config
	storage: LuzzleStorage
	flags: {
		dryRun: boolean
	}
}

export interface Command<U = Record<string, string | number | boolean>> {
	name: string
	command: string | ReadonlyArray<string>
	describe: string
	builder?: <T>(yargs: Argv<T>) => Argv<T & U>
	run: (ctx: Context, args: Arguments<U>) => Promise<void>
}
