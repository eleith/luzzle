import { vi } from 'vitest'

vi.mock('./prisma', () => {
  return {
    default: {
      $disconnect: vi.fn(),
      book: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  }
})
