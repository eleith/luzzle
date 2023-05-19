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
import { addTagsTo, removeAllTagsFrom, syncTagsFor, keywordsToTags } from '../tags'

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

      if (bookUpdate.keywords) {
        await syncTagsFor(ctx, keywordsToTags(bookUpdate.keywords), bookUpdate.id, 'books')
      }

      await markBookAsSynced(books, bookUpdate)
    }

    log.info(`updated ${book.slug}`)
  } catch (err) {
    log.error(`${bookMd.filename} could not be updated: ${err}`)
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

      if (bookAdded.keywords) {
        await addTagsTo(ctx, keywordsToTags(bookAdded.keywords), bookAdded.id, 'books')
      }

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

async function syncRemoveBooksExecute(ctx: Context, ids: string[]): Promise<void> {
  try {
    if (ctx.flags.dryRun === false) {
      await ctx.prisma.book.deleteMany({ where: { id: { in: ids } } })
      await removeAllTagsFrom(ctx, ids, 'books')
    }
    log.info(`deleted ${ids.length} book(s)`)
  } catch (err) {
    log.error(err as string)
  }
}

async function syncRemoveBooks(ctx: Context, diskSlugs: string[]): Promise<void> {
  const booksInDb = await ctx.prisma.book.findMany({ select: { slug: true, id: true } })
  const dbBookSlugs = booksInDb.map((book) => book.slug)
  const bookSlugsToRemove = difference(dbBookSlugs, diskSlugs)
  const bookIdsToRemove = booksInDb
    .filter((book) => bookSlugsToRemove.includes(book.slug))
    .map((book) => book.id)

  if (bookSlugsToRemove.length) {
    await syncRemoveBooksExecute(ctx, bookIdsToRemove)
  }
}

export { syncAddBook, syncUpdateBook, syncRemoveBooks }
