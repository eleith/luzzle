import yargs from 'yargs'
import { PrismaClient } from '@app/prisma'
import { promises, existsSync } from 'fs'
import { eachLimit } from 'async'
import path from 'path'
import { cpus } from 'os'
import {
  BookMd,
  bookToString,
  readBookDir,
  filterRecentlyUpdatedBooks,
  extractBooksOnDisk,
  bookOnDiskToBookCreateInput,
  bookOnDiskToBookUpdateInput,
  findNonExistantBooks,
} from './lib/book'

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
      description: 'run without making permanent changes',
      default: true,
    },
    sync: {
      choices: ['both', 'disk', 'db'],
      alias: 's',
      description: 'direction of sync',
      default: 'disk',
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

async function addBook(bookMd: BookMd): Promise<unknown> {
  const slug = bookMd.filename
  const bookCreateInput = bookOnDiskToBookCreateInput(bookMd)
  const bookAdded = await prisma.book.create({ data: bookCreateInput })
  const bookMdString = await bookToString(bookAdded)
  const errors = []

  try {
    if (commands.dryrun) {
      console.log(`adding ${slug}.md to db`)
      return
    }

    await promises.writeFile(path.join(commands.dir, `${slug}.md`), bookMdString)
    await promises.utimes(
      path.join(commands.dir, `${slug}.md`),
      bookAdded.date_updated,
      bookAdded.date_updated
    )
  } catch (err) {
    errors.push(err)
  }

  return errors.length ? errors : null
}

async function updateBook(bookMd: BookMd): Promise<unknown> {
  const id = bookMd.frontmatter.id
  const slug = bookMd.filename
  const book = await prisma.book.findUnique({ where: { id } })

  try {
    if (book) {
      const bookUpdateInput = bookOnDiskToBookUpdateInput(bookMd, book)

      if (commands.dryrun) {
        console.log(`updating ${slug}.md`)
        return
      }

      const bookUpdate = await prisma.book.update({
        where: { id },
        data: bookUpdateInput,
      })
      const bookMdString = await bookToString(bookUpdate)
      await promises.writeFile(path.join(commands.dir, `${slug}.md`), bookMdString)
      await promises.utimes(
        path.join(commands.dir, `${slug}.md`),
        bookUpdate.date_updated,
        bookUpdate.date_updated
      )
    }
    console.log("can't update book. no matching id")
  } catch (err) {
    return err
  }
}

async function removeBook(bookFiles: string[]): Promise<unknown> {
  const booksInDb = await prisma.book.findMany({ select: { id: true, slug: true } })
  const booksToRemove = findNonExistantBooks(bookFiles, booksInDb)
  const ids = booksToRemove.map((book) => book.id)

  try {
    if (commands.dryrun) {
      console.log(`deleting ${booksToRemove.map((book) => book.slug)}`)
      return
    }

    await prisma.book.deleteMany({ where: { id: { in: ids } } })
  } catch (err) {
    return err
  }
}

async function syncTwoWay(): Promise<void> {
  const { dir } = commands
  const bookFiles = await readBookDir(commands.dir)
  const books = await prisma.book.findMany({ select: { date_updated: true, slug: true } })
  const updatedBookFiles = await filterRecentlyUpdatedBooks(bookFiles, books, dir)
  const bookMds = await extractBooksOnDisk(updatedBookFiles, dir)
  const errors = []

  await eachLimit(bookMds, 1, async (bookMd) => {
    if (bookMd.frontmatter.id) {
      const err = await updateBook(bookMd)
      errors.push(err)
    } else {
      const err = await addBook(bookMd)
      errors.push(err)
    }
  })

  if (errors.length === 0) {
    await removeBook(bookFiles)
  }
}

async function syncToDisk(): Promise<void> {
  const { dir } = commands
  const books = await prisma.book.findMany()

  await eachLimit(books, cpus().length, async (book) => {
    const bookMdString = await bookToString(book)

    if (commands.dryrun) {
      console.log(`[disk] adding ${book.slug}.md`)
      return
    }

    await promises.writeFile(path.join(commands.dir, `${book.slug}.md`), bookMdString)
    await promises.utimes(path.join(dir, `${book.slug}.md`), book.date_updated, book.date_updated)
  })
}

async function syncToDb(): Promise<void> {
  const { dir } = commands
  const bookFiles = await readBookDir(commands.dir)
  const bookMds = await extractBooksOnDisk(bookFiles, dir)

  await eachLimit(bookMds, 1, async (bookMd) => {
    await addBook(bookMd)
  })
}

async function cleanup(): Promise<void> {
  await prisma.$disconnect()
}

async function run(): Promise<void> {
  const { sync } = commands

  if (sync === 'both') {
    await syncTwoWay()
  } else if (sync === 'disk') {
    await syncToDisk()
  } else if (sync === 'db') {
    await syncToDb()
  }

  await cleanup()
}

run().catch(console.error)
