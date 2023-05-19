import { merge } from 'lodash'
import { Context } from './index'
import { getPrismaClient, PrismaClient } from '../prisma'
import { Config } from '../config'
import log from '../log'
import { vi } from 'vitest'

vi.mock('../prisma')

const prisma = {
  $disconnect: vi.fn(),
  book: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
  tag: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
  tagMap: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    groupBy: vi.fn(),
  },
} as unknown as PrismaClient

function makeContext(overrides?: DeepPartial<Context>): Context {
  const prismaMock = vi.mocked(getPrismaClient)
  prismaMock.mockReturnValue(prisma)

  return merge(
    {
      prisma: prismaMock(),
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
