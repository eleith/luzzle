import { getPrismaClient, PrismaClient } from '@luzzle/prisma'
import { client } from '@app/common/emailjs'
import { SMTPClient } from 'emailjs'

const prisma = getPrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })

export interface Context {
  prisma: PrismaClient
  email: SMTPClient
}

export function createContext(): Context {
  return { prisma, email: client }
}
