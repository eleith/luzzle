import { Book } from '@app/prisma'
import Prisma from '@app/prisma'
import { eachLimit } from 'async'
import { existsSync, promises } from 'fs'
import { cpus } from 'os'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  BookMd,
  bookMdToBookCreateInput,
  bookMdToBookUpdateInput,
  bookToString,
  extractBooksOnDisk,
  filterRecentlyUpdatedBooks,
  findNonExistantBooks,
  readBookDir,
} from './lib/book'
import log from './lib/log'

const { PrismaClient } = Prisma

const commands = yargs(hideBin(process.argv))
  .command('sync <dir>', 'sync directory to local database')
  .command('dump <dir>', 'dump database to local markdown files')
  .positional('dir', {
    type: 'string',
    description: 'directory for the book entries',
    demandOption: true,
  })
  .options({
    'dry-run': {
      type: 'boolean',
      description: 'run without making permanent changes',
      default: false,
    },
    verbose: {
      alias: 'v',
      type: 'count',
    },
  })
  .check((args) => {
    if (args.dir && !existsSync(args.dir)) {
      throw new Error(`[error] '${args.dir}' is not a folder`)
    }

    if (['sync', 'dump'].indexOf(args._[0] as string) == -1) {
      throw new Error(`[error] '${args._}' is not a valid command`)
    }

    return true
  })
  .demandCommand(1, `[error] please specify a command`)
  .parseSync()

const prisma = new PrismaClient()

async function addBookToDb(bookMd: BookMd): Promise<unknown> {
  const err = commands['dry-run'] ? null : await addBookToDbExecute(bookMd)

  if (!err) {
    log.info('[db]', `added ${bookMd.filename}`)
    log.info('[disk]', `synced db cache to ${bookMd.filename}`)
  } else {
    log.error('[db]', err as string)
  }

  return err
}

async function addBookToDbExecute(bookMd: BookMd): Promise<unknown> {
  const filename = bookMd.filename
  const filepath = path.join(commands.dir, filename)

  try {
    const bookCreateInput = await bookMdToBookCreateInput(bookMd, commands.dir)
    const bookAdded = await prisma.book.create({ data: bookCreateInput })
    const bookMdString = await bookToString(bookAdded)

    await promises.writeFile(filepath, bookMdString)
    await promises.utimes(filepath, bookAdded.date_updated, bookAdded.date_updated)
  } catch (err) {
    return err
  }
}

async function updateBookToDb(bookMd: BookMd): Promise<unknown> {
  const id = bookMd.frontmatter.__database_cache?.id
  const book = await prisma.book.findUnique({ where: { id } })

  if (book) {
    const err = commands['dry-run'] ? null : await updateBookToDbExecute(bookMd, book)

    if (!err) {
      log.info('[db]', `updated ${bookMd.filename}`)
      log.info('[disk]', `synced db cache ${bookMd.filename}`)
    } else {
      log.error('[db]', err as string)
    }
    return err
  }

  return new Error(`${bookMd.filename} pointed to non-existant ${id}`)
}

async function updateBookToDbExecute(bookMd: BookMd, book: Book): Promise<unknown> {
  const filename = bookMd.filename
  const filepath = path.join(commands.dir, filename)

  try {
    const bookUpdateInput = await bookMdToBookUpdateInput(bookMd, book, commands.dir)
    const bookUpdate = await prisma.book.update({
      where: { id: book.id },
      data: bookUpdateInput,
    })
    const bookMdString = await bookToString(bookUpdate)
    await promises.writeFile(filepath, bookMdString)
    await promises.utimes(filepath, bookUpdate.date_updated, bookUpdate.date_updated)
  } catch (err) {
    return err
  }
}

async function removeBookFromDb(bookSlugs: string[]): Promise<unknown> {
  const booksInDb = await prisma.book.findMany({ select: { id: true, slug: true } })
  const booksToRemove = findNonExistantBooks(bookSlugs, booksInDb)
  const ids = booksToRemove.map((book) => book.id)

  if (ids.length) {
    const err = commands['dry-run'] ? null : await removeBookFromDbExecute(ids)

    if (!err) {
      log.info('[db]', `deleted ${booksToRemove.map((book) => book.slug)}`)
    } else {
      log.error('[db]', err as string)
    }
    return err
  }
}

async function removeBookFromDbExecute(ids: string[]): Promise<unknown> {
  try {
    await prisma.book.deleteMany({ where: { id: { in: ids } } })
  } catch (err) {
    return err
  }
}

async function syncToDb(): Promise<void> {
  const { dir } = commands
  const bookSlugs = await readBookDir(commands.dir)
  const books = await prisma.book.findMany({ select: { date_updated: true, slug: true } })
  const updatedBookFiles = await filterRecentlyUpdatedBooks(bookSlugs, books, dir)
  const bookMds = await extractBooksOnDisk(updatedBookFiles, dir)
  const errors: unknown[] = []

  await eachLimit(bookMds, 1, async (bookMd) => {
    if (bookMd.frontmatter.__database_cache?.id) {
      const err = await updateBookToDb(bookMd)
      errors.push(err)
    } else {
      const err = await addBookToDb(bookMd)
      errors.push(err)
    }
  })

  if (errors.length === 0) {
    await removeBookFromDb(bookSlugs)
  }
}

async function syncToDisk(): Promise<void> {
  const books = await prisma.book.findMany()

  await eachLimit(books, cpus().length, async (book) => {
    await syncBookToDisk(book)
  })
}

async function syncBookToDisk(book: Book): Promise<void> {
  const bookMd = await bookToString(book)
  const file = path.join(commands.dir, `${book.slug}.md`)
  const exists = existsSync(file)

  if (exists) {
    const currentBookMdString = await promises.readFile(
      path.join(commands.dir, `${book.slug}.md`),
      'utf-8'
    )
    if (currentBookMdString === bookMd) {
      return
    }
  }

  const err = commands['dry-run']
    ? null
    : await syncBookToDiskExecute(file, bookMd, book.date_updated)

  if (!err) {
    log.info('[disk]', `wrote ${file}`)
  } else {
    log.error('[disk]', err as string)
  }
}

async function syncBookToDiskExecute(
  filepath: string,
  bookMd: string,
  updated: Date
): Promise<unknown> {
  try {
    await promises.writeFile(filepath, bookMd)
    await promises.utimes(filepath, updated, updated)
  } catch (err) {
    return err
  }
}

async function cleanup(): Promise<void> {
  await prisma.$disconnect()
}

async function run(): Promise<void> {
  const command = commands._[0]
  log.level = commands.verbose === 0 ? 'info' : 'silly'
  log.heading = commands['dry-run'] ? '[would-have]' : ''

  if (command === 'sync') {
    await syncToDisk()
  } else if (command === 'dump') {
    await syncToDb()
  }

  await cleanup()
}

run().catch(console.error)
