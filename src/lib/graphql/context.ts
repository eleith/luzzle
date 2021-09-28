import { PrismaClient } from '@app/prisma'

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
}

export function createContext(): Context {
  return { prisma }
}
