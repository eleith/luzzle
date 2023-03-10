import { merge } from 'lodash'
import { Context } from './index'
import { DeepPartial } from '../../@types/utilities'
import { PrismaClient } from '../prisma'
import { Config } from '../config'
import log from '../log'

function makeContext(overrides?: DeepPartial<Context>): Context {
  return merge(
    {
      prisma: {} as PrismaClient,
      log,
      directory: 'somewhere',
      config: {} as Config,
      flags: {
        dryRun: false,
        verbose: false,
        force: false,
      },
    },
    overrides
  )
}

export { makeContext }
