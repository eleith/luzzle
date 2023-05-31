import { LuzzleDatabase } from '@luzzle/kysely'
import { merge, omit } from 'lodash'
import { Context } from './index'
import { Config } from '../config'
import log from '../log'

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
