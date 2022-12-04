import { getPrismaClient, PrismaClient } from '@luzzle/prisma'
import { client } from '@app/common/emailjs'
import { SMTPClient } from 'emailjs'
import config from '@app/common/config'

const prisma = getPrismaClient({ datasources: { db: { url: config.private.DATABASE_URL } } })

export interface Context {
  prisma: PrismaClient
  email: SMTPClient
}

export function createContext(): Context {
  return { prisma, email: client }
}
