import { LuzzleDatabase } from '@luzzle/kysely'
import { merge, omit } from 'lodash-es'
import { Context } from './index.js'
import { Config } from '../config.js'
import log from '../log.js'

function makeContext(
	overrides?: Partial<Pick<Context, 'db'>> & DeepPartial<Omit<Context, 'db' | 'log'>>
): Context {
	return {
		db: overrides?.db || ({} as LuzzleDatabase),
		...merge(
			{
				log,
				directory: 'somewhere',
				config: {} as Config,
				flags: {
					dryRun: false,
					verbose: false,
				},
			},
			omit(overrides, 'db')
		),
	}
}

export { makeContext }
