import Prisma from '@app/prisma'

export type { Book, PrismaClient } from '@app/prisma'

const prisma = new Prisma.PrismaClient()

export default prisma
