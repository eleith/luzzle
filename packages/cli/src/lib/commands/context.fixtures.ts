import { LuzzleDatabase } from '@luzzle/core'
import { merge, omit } from 'lodash-es'
import { Context } from './index.js'
import { Config } from '../config.js'
import log from '../log.js'
import { Pieces } from '../pieces/index.js'

function makeContext(
	overrides?: Partial<Pick<Context, 'db'>> & DeepPartial<Omit<Context, 'db' | 'log'>>
): Context {
	return {
		db: overrides?.db || ({} as LuzzleDatabase),
		...merge(
			{
				log,
				directory: 'somewhere',
				pieces: {} as Pieces,
				config: {} as Config,
				flags: {
					dryRun: false,
				},
			},
			omit(overrides, 'db')
		),
	}
}

export { makeContext }
