import log from '../log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { makeBookMd, makeBook, makeBookCreateInput } from '../books/book.fixtures'
import { makeContext } from './context.fixtures'
import {
  getBook,
  bookMdToBookUpdateInput,
  bookMdToBookCreateInput,
  getSlugFromBookMd,
  getUpdatedSlugs,
} from '../books'
import { syncAddBook, syncUpdateBook, syncRemoveBooks } from './sync.private'
import { makeBooks } from '../books/books.mock'

vi.mock('../books')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  getUpdatedSlugs: vi.mocked(getUpdatedSlugs),
  getBook: vi.mocked(getBook),
  bookMdToBookUpdateInput: vi.mocked(bookMdToBookUpdateInput),
  bookMdToBookCreateInput: vi.mocked(bookMdToBookCreateInput),
  getSlugFromBookMd: vi.mocked(getSlugFromBookMd),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/sync.private', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    Object.keys(spies).forEach((key) => {
      spies[key].mockRestore()
      delete spies[key]
    })
  })

  test('syncAddBook', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaCreate = vi.spyOn(ctx.prisma.book, 'create')

    spies.prismaCreate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(null)

    await syncAddBook(ctx, books, bookMd)

    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(spies.prismaCreate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
  })

  test('syncAddBook already exists', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaCreate = vi.spyOn(ctx.prisma.book, 'create')
    spies.prismaUpdate = vi.spyOn(ctx.prisma.book, 'update')

    spies.prismaCreate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(book)

    await syncAddBook(ctx, books, bookMd)

    expect(mocks.bookMdToBookCreateInput).not.toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalled()
    expect(spies.prismaCreate).not.toHaveBeenCalledOnce()
    expect(spies.prismaUpdate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
  })

  test('syncAddBook with flag dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaCreate = vi.spyOn(ctx.prisma.book, 'create')

    spies.prismaCreate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(null)

    await syncAddBook(ctx, books, bookMd)

    expect(mocks.bookMdToBookCreateInput).not.toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(spies.prismaCreate).not.toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
  })

  test('syncAddBook catches error', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const books = makeBooks()

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.logError.mockResolvedValueOnce()

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaCreate = vi.spyOn(ctx.prisma.book, 'create')

    spies.prismaCreate.mockRejectedValueOnce(new Error('error'))
    spies.prismaFindUnique.mockResolvedValueOnce(null)

    await syncAddBook(ctx, books, bookMd)

    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(spies.prismaCreate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test('syncUpdateBook', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaUpdate = vi.spyOn(ctx.prisma.book, 'update')

    spies.prismaUpdate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(book)

    await syncUpdateBook(ctx, books, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledOnce()
    expect(spies.prismaUpdate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
  })

  test('syncUpdateBook with flag dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaUpdate = vi.spyOn(ctx.prisma.book, 'update')

    spies.prismaUpdate.mockResolvedValueOnce(book)
    spies.prismaFindUnique.mockResolvedValueOnce(book)

    await syncUpdateBook(ctx, books, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalledOnce()
    expect(spies.prismaUpdate).not.toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
  })

  test('syncUpdateBook catches error', async () => {
    const ctx = makeContext()
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    spies.prismaFindUnique = vi.spyOn(ctx.prisma.book, 'findUnique')
    spies.prismaUpdate = vi.spyOn(ctx.prisma.book, 'update')

    spies.prismaUpdate.mockRejectedValueOnce(new Error('error'))
    spies.prismaFindUnique.mockResolvedValueOnce(book)

    await syncUpdateBook(ctx, books, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledOnce()
    expect(spies.prismaUpdate).toHaveBeenCalledOnce()
    expect(spies.prismaFindUnique).toHaveBeenCalledOnce()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test('syncRemoveBook', async () => {
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

  test('syncRemoveBook with flag dry-flag', async () => {
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

  test('syncRemoveBook catches error', async () => {
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
