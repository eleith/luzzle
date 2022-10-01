import { getPrismaClient } from '@luzzle/prisma'

export type { Book, Prisma, PrismaClient } from '@luzzle/prisma'
export default getPrismaClient()
