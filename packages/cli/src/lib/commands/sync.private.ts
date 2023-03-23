import log from '../log'
import { Context } from './utils/types'
import {
  markBookAsSynced,
  bookMdToBookUpdateInput,
  bookMdToBookCreateInput,
  getSlugFromBookMd,
  Books,
  BookMd,
} from '../books'
import { Book } from '../prisma'
import { difference } from 'lodash'

async function syncUpdateBookExecute(
  ctx: Context,
  books: Books,
  bookMd: BookMd,
  book: Book
): Promise<void> {
  try {
    if (ctx.flags.dryRun === false) {
      const bookUpdateInput = await bookMdToBookUpdateInput(books, bookMd, book)
      const bookUpdate = await ctx.prisma.book.update({
        where: { id: book.id },
        data: bookUpdateInput,
      })
      await markBookAsSynced(books, bookUpdate)
    }

    log.info(`updated ${book.slug}`)
  } catch (err) {
    log.error(`${bookMd.filename} could not be updated`)
  }
}

async function syncAddBook(ctx: Context, books: Books, bookMd: BookMd): Promise<void> {
  const maybeBook = await ctx.prisma.book.findUnique({ where: { slug: getSlugFromBookMd(bookMd) } })

  if (maybeBook) {
    await syncUpdateBookExecute(ctx, books, bookMd, maybeBook)
    return
  }

  try {
    if (ctx.flags.dryRun === false) {
      const bookCreateInput = await bookMdToBookCreateInput(books, bookMd)
      const bookAdded = await ctx.prisma.book.create({ data: bookCreateInput })

      await markBookAsSynced(books, bookAdded)
    }
    log.info(`added ${bookMd.filename}`)
  } catch (err) {
    log.error(err as string)
  }
}

async function syncUpdateBook(
  ctx: Context,
  books: Books,
  bookMd: BookMd,
  id: string
): Promise<void> {
  const book = await ctx.prisma.book.findUnique({ where: { id } })

  if (book) {
    await syncUpdateBookExecute(ctx, books, bookMd, book)
    return
  }
}

async function syncRemoveBooksExecute(ctx: Context, slugs: string[]): Promise<void> {
  try {
    if (ctx.flags.dryRun === false) {
      await ctx.prisma.book.deleteMany({ where: { slug: { in: slugs } } })
    }
    log.info(`deleted ${slugs.join(', ')}`)
  } catch (err) {
    log.error(err as string)
  }
}

async function syncRemoveBooks(ctx: Context, diskSlugs: string[]): Promise<void> {
  const booksInDb = await ctx.prisma.book.findMany({ select: { slug: true } })
  const dbSlugs = booksInDb.map((book) => book.slug)
  const booksToRemove = difference(dbSlugs, diskSlugs)

  if (booksToRemove.length) {
    await syncRemoveBooksExecute(ctx, booksToRemove)
  }
}

export { syncAddBook, syncUpdateBook, syncRemoveBooks }
