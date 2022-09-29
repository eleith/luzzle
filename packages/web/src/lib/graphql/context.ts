import { PrismaClient } from '@app/prisma'
import { client } from '@app/common/emailjs'
import { SMTPClient } from 'emailjs'

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
  email: SMTPClient
}

export function createContext(): Context {
  return { prisma, email: client }
}
