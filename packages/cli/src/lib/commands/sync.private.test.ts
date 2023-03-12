import log from '../log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { makeBookMd, makeBook, makeBookCreateInput } from '../book.fixtures'
import { makeContext } from './context.fixtures'
import {
  getBook,
  cacheBook,
  bookMdToBookUpdateInput,
  bookMdToBookCreateInput,
  getSlugFromBookMd,
  readBookDir,
  getUpdatedSlugs,
  getBookCache,
} from '../book'
import { syncAddBook, syncUpdateBook, syncRemoveBooks } from './sync.private'

vi.mock('../book')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  getUpdatedSlugs: vi.mocked(getUpdatedSlugs),
  getBook: vi.mocked(getBook),
  cacheBook: vi.mocked(cacheBook),
  bookMdToBookUpdateInput: vi.mocked(bookMdToBookUpdateInput),
  bookMdToBookCreateInput: vi.mocked(bookMdToBookCreateInput),
  getSlugFromBookMd: vi.mocked(getSlugFromBookMd),
  readBookDir: vi.mocked(readBookDir),
  getBookCache: vi.mocked(getBookCache),
}

const spies: { [key: string]: SpyInstance } = {}

describe('tools/lib/commands/sync.private', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    Object.keys(spies).forEach((key) => {
      spies[key].mockRestore()
      delete spies[key]
    })
  })

  test.only('syncAddBook', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.cacheBook.mockResolvedValueOnce()

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaCreate = vi.spyOn(ctx.prisma.book, 'create')

    spies.prismaCreate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(null)

    await syncAddBook(ctx, bookMd)

    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(spies.prismaCreate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
    expect(mocks.cacheBook).toHaveBeenCalledOnce()
  })

  test.only('syncAddBook already exists', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.cacheBook.mockResolvedValueOnce()

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaCreate = vi.spyOn(ctx.prisma.book, 'create')
    spies.prismaUpdate = vi.spyOn(ctx.prisma.book, 'update')

    spies.prismaCreate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(book)

    await syncAddBook(ctx, bookMd)

    expect(mocks.bookMdToBookCreateInput).not.toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalled()
    expect(spies.prismaCreate).not.toHaveBeenCalledOnce()
    expect(spies.prismaUpdate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
  })

  test.only('syncAddBook with flag dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.cacheBook.mockResolvedValueOnce()

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaCreate = vi.spyOn(ctx.prisma.book, 'create')

    spies.prismaCreate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(null)

    await syncAddBook(ctx, bookMd)

    expect(mocks.bookMdToBookCreateInput).not.toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(spies.prismaCreate).not.toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
  })

  test.only('syncAddBook catches error', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.cacheBook.mockResolvedValueOnce()
    mocks.logError.mockResolvedValueOnce()

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaCreate = vi.spyOn(ctx.prisma.book, 'create')

    spies.prismaCreate.mockRejectedValueOnce(new Error('error'))
    spies.prismaFindUnique.mockResolvedValueOnce(null)

    await syncAddBook(ctx, bookMd)

    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(spies.prismaCreate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test.only('syncUpdateBook', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.cacheBook.mockResolvedValueOnce()

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaUpdate = vi.spyOn(ctx.prisma.book, 'update')

    spies.prismaUpdate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(book)

    await syncUpdateBook(ctx, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledOnce()
    expect(spies.prismaUpdate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
    expect(mocks.cacheBook).toHaveBeenCalledOnce()
  })

  test.only('syncUpdateBook with flag dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.cacheBook.mockResolvedValueOnce()

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaUpdate = vi.spyOn(ctx.prisma.book, 'update')

    spies.prismaUpdate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(book)

    await syncUpdateBook(ctx, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalledOnce()
    expect(spies.prismaUpdate).not.toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
    expect(mocks.cacheBook).not.toHaveBeenCalledOnce()
  })

  test.only('syncUpdateBook catches error', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.cacheBook.mockResolvedValueOnce()

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaUpdate = vi.spyOn(ctx.prisma.book, 'update')

    spies.prismaUpdate.mockRejectedValueOnce(new Error('error'))
    spies.prismaFindUnique.mockResolvedValueOnce(book)

    await syncUpdateBook(ctx, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledOnce()
    expect(spies.prismaUpdate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
    expect(mocks.cacheBook).not.toHaveBeenCalledOnce()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test.only('syncRemoveBook', async () => {
    const ctx = makeContext()
    const slug = 'slug1'
    const book = makeBook({ slug })

    spies.prismaFindMany = vi.spyOn(ctx.prisma.book, 'findMany')
    spies.prismaDeleteMany = vi.spyOn(ctx.prisma.book, 'deleteMany')

    spies.prismaFindMany.mockResolvedValueOnce([book])
    spies.prismaDeleteMany.mockResolvedValueOnce(null)

    await syncRemoveBooks(ctx, [])

    expect(spies.prismaFindMany).toHaveBeenCalledOnce()
    expect(spies.prismaDeleteMany).toHaveBeenCalledOnce()
  })

  test.only('syncRemoveBook with flag dry-flag', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const slug = 'slug1'
    const book = makeBook({ slug })

    spies.prismaFindMany = vi.spyOn(ctx.prisma.book, 'findMany')
    spies.prismaDeleteMany = vi.spyOn(ctx.prisma.book, 'deleteMany')

    spies.prismaFindMany.mockResolvedValueOnce([book])
    spies.prismaDeleteMany.mockResolvedValueOnce(null)

    await syncRemoveBooks(ctx, [])

    expect(spies.prismaFindMany).toHaveBeenCalledOnce()
    expect(spies.prismaDeleteMany).not.toHaveBeenCalledOnce()
  })

  test.only('syncRemoveBook catches error', async () => {
    const ctx = makeContext()
    const slug = 'slug1'
    const book = makeBook({ slug })

    spies.prismaFindMany = vi.spyOn(ctx.prisma.book, 'findMany')
    spies.prismaDeleteMany = vi.spyOn(ctx.prisma.book, 'deleteMany')

    spies.prismaFindMany.mockResolvedValueOnce([book])
    spies.prismaDeleteMany.mockRejectedValueOnce(new Error('error'))

    await syncRemoveBooks(ctx, [])

    expect(spies.prismaFindMany).toHaveBeenCalledOnce()
    expect(spies.prismaDeleteMany).toHaveBeenCalledOnce()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })
})
