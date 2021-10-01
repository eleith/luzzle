import yargs from 'yargs'
import { Prisma, PrismaClient } from '@app/prisma'
import { promises, existsSync } from 'fs'
import { eachLimit } from 'async'
import path from 'path'
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
  })
  .check((argv) => {
    if (argv.dir && !existsSync(argv.dir)) {
      throw new Error(`${argv.dir} does not exist`)
    }

    return true
  })
  .parseSync()

async function addBook(prisma: PrismaClient, bookMd: BookMd, dir: string): Promise<void> {
  const slug = bookMd.filename
  const bookCreateInput = bookOnDiskToBookCreateInput(bookMd)
  const bookAdded = await prisma.book.create({ data: bookCreateInput })
  const bookMdString = await bookToString(bookAdded)

  try {
    await promises.writeFile(path.join(dir, `${slug}.md`), bookMdString)
    await promises.utimes(
      path.join(dir, `${slug}.md`),
      bookAdded.date_updated,
      bookAdded.date_updated
    )
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.log(err.code, err.message)
    }
  }
}

async function updateBook(prisma: PrismaClient, bookMd: BookMd, dir: string): Promise<void> {
  const id = bookMd.frontmatter.id
  const slug = bookMd.filename
  const book = await prisma.book.findUnique({ where: { id } })

  try {
    if (book) {
      const bookUpdateInput = bookOnDiskToBookUpdateInput(bookMd, book)
      const bookUpdate = await prisma.book.update({
        where: { id },
        data: bookUpdateInput,
      })
      const bookMdString = await bookToString(bookUpdate)
      await promises.writeFile(path.join(dir, `${slug}.md`), bookMdString)
      await promises.utimes(
        path.join(dir, `${slug}.md`),
        bookUpdate.date_updated,
        bookUpdate.date_updated
      )
    }
    console.log("can't update book. no matching id")
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.log(err.code, err.message)
    }
  }
}

async function removeBook(prisma: PrismaClient, bookFiles: string[]): Promise<void> {
  const booksInDb = await prisma.book.findMany({ select: { id: true, slug: true } })
  const booksToRemove = findNonExistantBooks(bookFiles, booksInDb)
  const ids = booksToRemove.map((book) => book.id)

  try {
    await prisma.book.deleteMany({ where: { id: { in: ids } } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.log(err.code, err.message)
    }
  }
}

async function run(command: typeof commands): Promise<void> {
  const prisma = new PrismaClient()
  const bookFiles = await readBookDir(command.dir)
  const books = await prisma.book.findMany({ select: { date_updated: true, slug: true } })
  const updatedBookFiles = await filterRecentlyUpdatedBooks(bookFiles, books, command.dir)
  const bookMds = await extractBooksOnDisk(updatedBookFiles, command.dir)

  await eachLimit(bookMds, 1, async (bookMd) => {
    if (bookMd.frontmatter.id) {
      await updateBook(prisma, bookMd, command.dir)
    } else {
      await addBook(prisma, bookMd, command.dir)
    }
  })

  await removeBook(prisma, bookFiles)

  await prisma.$disconnect()
}

run(commands).catch(console.error)
