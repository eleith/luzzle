import { Book, PrismaClient } from '@app/prisma'
import { eachLimit } from 'async'
import { existsSync, promises } from 'fs'
import { cpus } from 'os'
import path from 'path'
import yargs from 'yargs'
import {
  BookMd,
  bookOnDiskToBookCreateInput,
  bookOnDiskToBookUpdateInput,
  bookToString,
  extractBooksOnDisk,
  filterRecentlyUpdatedBooks,
  findNonExistantBooks,
  readBookDir,
} from './lib/book'
import log from 'npmlog'

const commands = yargs(process.argv.slice(2))
  .options({
    dir: {
      type: 'string',
      alias: 'd',
      description: 'directory to store book entries as md files',
      demandOption: true,
    },
    dryrun: {
      type: 'boolean',
      alias: 'dry-run',
      description: 'run without making permanent changes',
      default: false,
    },
    sync: {
      choices: ['both', 'disk', 'db'],
      alias: 's',
      description: 'direction of sync',
      default: 'disk',
    },
    verbose: {
      alias: 'v',
      type: 'count',
    },
  })
  .check((argv) => {
    if (argv.dir && !existsSync(argv.dir)) {
      throw new Error(`${argv.dir} does not exist`)
    }

    return true
  })
  .parseSync()

const prisma = new PrismaClient()

async function addBookToDb(bookMd: BookMd): Promise<unknown> {
  const err = commands.dryrun ? null : await addBookToDbExecute(bookMd)

  if (!err) {
    log.info('[db]', `added ${bookMd.filename}.md`)
  } else {
    log.error('[db]', err as string)
  }

  return err
}

async function addBookToDbExecute(bookMd: BookMd): Promise<unknown> {
  const slug = bookMd.filename
  const bookCreateInput = bookOnDiskToBookCreateInput(bookMd)
  const bookAdded = await prisma.book.create({ data: bookCreateInput })
  const bookMdString = await bookToString(bookAdded)

  try {
    await promises.writeFile(path.join(commands.dir, `${slug}.md`), bookMdString)
    await promises.utimes(
      path.join(commands.dir, `${slug}.md`),
      bookAdded.date_updated,
      bookAdded.date_updated
    )
  } catch (err) {
    return err
  }
}

async function updateBookToDb(bookMd: BookMd): Promise<unknown> {
  const id = bookMd.frontmatter.id
  const book = await prisma.book.findUnique({ where: { id } })

  if (book) {
    const err = commands.dryrun ? null : await updateBookToDbExecute(bookMd, book)

    if (!err) {
      log.info('[db]', `updated ${bookMd.filename}.md`)
    } else {
      log.error('[db]', err as string)
    }
    return err
  }

  return new Error(`${bookMd.filename}.md pointed to non-existant ${id}`)
}

async function updateBookToDbExecute(bookMd: BookMd, book: Book): Promise<unknown> {
  const slug = bookMd.filename

  try {
    const bookUpdateInput = bookOnDiskToBookUpdateInput(bookMd, book)
    const bookUpdate = await prisma.book.update({
      where: { id: book.id },
      data: bookUpdateInput,
    })
    const bookMdString = await bookToString(bookUpdate)
    await promises.writeFile(path.join(commands.dir, `${slug}.md`), bookMdString)
    await promises.utimes(
      path.join(commands.dir, `${slug}.md`),
      bookUpdate.date_updated,
      bookUpdate.date_updated
    )
  } catch (err) {
    return err
  }
}

async function removeBookFromDb(bookFiles: string[]): Promise<unknown> {
  const booksInDb = await prisma.book.findMany({ select: { id: true, slug: true } })
  const booksToRemove = findNonExistantBooks(bookFiles, booksInDb)
  const ids = booksToRemove.map((book) => book.id)

  const err = commands.dryrun ? null : await removeBookFromDbExecute(ids)

  if (!err) {
    log.info('[db]', `deleted ${booksToRemove.map((book) => book.slug)}`)
  } else {
    log.error('[db]', err as string)
  }

  return err
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
  const bookFiles = await readBookDir(commands.dir)
  const books = await prisma.book.findMany({ select: { date_updated: true, slug: true } })
  const updatedBookFiles = await filterRecentlyUpdatedBooks(bookFiles, books, dir)
  const bookMds = await extractBooksOnDisk(updatedBookFiles, dir)
  const errors: unknown[] = []

  await eachLimit(bookMds, 1, async (bookMd) => {
    if (bookMd.frontmatter.id) {
      const err = await updateBookToDb(bookMd)
      errors.push(err)
    } else {
      const err = await addBookToDb(bookMd)
      errors.push(err)
    }
  })

  if (errors.length === 0) {
    await removeBookFromDb(bookFiles)
  }
}

async function syncToDisk(): Promise<void> {
  const books = await prisma.book.findMany()

  await eachLimit(books, cpus().length, async (book) => {
    if (!commands.dryrun) {
      await syncBookToDiskExecute(book)
    }
    log.info('[disk]', `wrote ${book.slug}.md`)
  })
}

async function syncBookToDiskExecute(book: Book): Promise<void> {
  const bookMdString = await bookToString(book)

  await promises.writeFile(path.join(commands.dir, `${book.slug}.md`), bookMdString)
  await promises.utimes(
    path.join(commands.dir, `${book.slug}.md`),
    book.date_updated,
    book.date_updated
  )
}

async function cleanup(): Promise<void> {
  await prisma.$disconnect()
}

async function run(): Promise<void> {
  const { sync, verbose, dryrun } = commands

  log.level = verbose === 0 ? 'info' : 'silly'
  log.heading = dryrun ? '[would]' : ''

  if (sync === 'disk') {
    await syncToDisk()
  } else if (sync === 'db') {
    await syncToDb()
  }

  await cleanup()
}

run().catch(console.error)
