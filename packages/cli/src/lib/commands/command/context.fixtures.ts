import { LuzzleDatabase } from '@luzzle/core'
import { merge, omit } from 'lodash-es'
import { Command, Context } from '../index.js'
import { Config } from '../../config.js'
import log from '../../log.js'
import { Pieces } from '../../pieces/index.js'
import { makeStorage } from '../../pieces/piece.fixtures.js'

function makeContext(
	overrides?: Partial<Pick<Context, 'db' | 'storage'>> &
		DeepPartial<Omit<Context, 'db' | 'log' | 'storage'>>
): Context {
	const storage = overrides?.storage || makeStorage('root')
	return {
		db: overrides?.db || ({} as LuzzleDatabase),
		...merge(
			{
				log,
				storage,
				pieces: new Pieces(storage),
				config: { set: () => {}, delete: () => {}, get: () => {} } as unknown as Config,
				flags: {
					dryRun: false,
				},
			},
			omit(overrides, 'db')
		),
	}
}

function makeCommand<T>(name: string, run: () => Promise<void> = async () => {}) {
	const command: Command<T> = {
		name,
		command: `${name} [flags]`,
		describe: `a test command`,
		run,
	}

	return command
}

export { makeContext, makeCommand }
