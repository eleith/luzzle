import log from '../log'
import { Context } from './_types'
import {
  BookMd,
  cacheBook,
  bookMdToBookUpdateInput,
  bookMdToBookCreateInput,
  getSlugFromBookMd,
} from '../book'
import { Book } from '../prisma'
import { difference } from 'lodash'

async function syncUpdateBookExecute(ctx: Context, bookMd: BookMd, book: Book): Promise<void> {
  const dir = ctx.directory
  try {
    if (ctx.flags.dryRun === false) {
      const bookUpdateInput = await bookMdToBookUpdateInput(bookMd, book, dir)
      const bookUpdate = await ctx.prisma.book.update({
        where: { id: book.id },
        data: bookUpdateInput,
      })
      await cacheBook(bookUpdate, dir)
    }

    log.info(`updated ${book.slug}`)
  } catch (err) {
    log.error(`${bookMd.filename} could not be updated`)
  }
}

async function syncAddBook(ctx: Context, bookMd: BookMd): Promise<void> {
  const maybeBook = await ctx.prisma.book.findUnique({ where: { slug: getSlugFromBookMd(bookMd) } })

  if (maybeBook) {
    await syncUpdateBookExecute(ctx, bookMd, maybeBook)
    return
  }

  try {
    if (ctx.flags.dryRun === false) {
      const bookCreateInput = await bookMdToBookCreateInput(bookMd, ctx.directory)
      const bookAdded = await ctx.prisma.book.create({ data: bookCreateInput })

      await cacheBook(bookAdded, ctx.directory)
    }
    log.info(`added ${bookMd.filename}`)
  } catch (err) {
    log.error(err as string)
  }
}

async function syncUpdateBook(ctx: Context, bookMd: BookMd, id: string): Promise<void> {
  const book = await ctx.prisma.book.findUnique({ where: { id } })

  if (book) {
    await syncUpdateBookExecute(ctx, bookMd, book)
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
