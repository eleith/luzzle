import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@app/prisma'
import prisma from './prisma'

jest.mock('./prisma', () => {
  return mockDeep<PrismaClient>()
})

export const prismaClientMockReset = ():void => {
  mockReset(prisma)
}

export default prisma as unknown as DeepMockProxy<PrismaClient>
