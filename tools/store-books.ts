import { PrismaClient, Prisma, Book } from '@prisma/client'
import {
  getDetailsByIsbn,
  getDetailsByBookId,
  OpenLibrarySearchResponse,
  getDetailsByWorkId,
} from './openlibrary'
import { forEachRowIn, BookRow } from './books-csv'
import { queue } from 'async'
import { downloadImage } from './downloader'

const prisma = new PrismaClient()
const genres = [
  'fiction',
  'nonfiction',
  'classic',
  'crime',
  'detective',
  'epic',
  'fable',
  'fairy tale',
  'fantasy',
  'folktale',
  'gothic',
  'historical',
  'horror',
  'humor',
  'legend',
  'magical realism',
  'meta',
  'mystery',
  'mythology',
  'mythopoeia',
  'realistic',
  'romance',
  'satire',
  'science',
  'short story',
  'spy',
  'superhero',
  'swashbuckler',
  'tall tale',
  'theological',
  'suspense',
  'thriller',
  'tragicomedy',
  'travel',
  'western',
  'biography',
  'essay',
  'journalism',
  'memoir',
  'narrative',
  'reference',
  'self improvement',
  'speech',
  'scientific article',
  'textbook',
]

function openLibraryResponseBookToBookUpdateInput(
  book: BookRow,
  details: OpenLibrarySearchResponse
): Prisma.BookUpdateInput {
  const author = details.authors[0].name
  const coauthors =
    details.authors.length > 1
      ? details.authors
          .slice(1)
          .map((x) => x.name)
          .join(',')
      : undefined
  const openlibraryId = details.key.replace(/^\/?books\//, '')
  const readDate = book.readDate ? new Date(book.readDate) : undefined
  const publishedYear = details.publish_date
    ? new Date(details.publish_date).getUTCFullYear() || undefined
    : undefined
  const subjects = details.subjects?.length
    ? [details.subjects.map((x) => x.name)].join(',')
    : undefined
  const places = details.subject_places?.length
    ? [details.subject_places.map((x) => x.name)].join(',')
    : undefined
  const keywords = subjects || places ? [subjects || '', places || ''].join(',') : undefined

  return {
    title: details.title,
    subtitle: details.subtitle,
    author,
    coauthors,
    id_ol_book: openlibraryId,
    pages: details.number_of_pages,
    year_read: readDate ? readDate.getUTCFullYear() : undefined,
    month_read: readDate ? readDate.getUTCMonth() : undefined,
    year_first_published: publishedYear,
    keywords,
  }
}

async function onRow(book: BookRow): Promise<void> {
  if (book.isbn) {
    const details = await getDetailsByIsbn(book.isbn)
    if (details) {
      const info = openLibraryResponseBookToBookUpdateInput(book, details)

      console.log(`updating ${details.title}`)

      await prisma.book.upsert({
        where: {
          isbn: book.isbn,
        },
        update: info,
        create: { ...info, isbn: book.isbn } as Prisma.BookCreateInput,
      })
    }
  }
}

async function findWorkIds(): Promise<void> {
  const books = await prisma.book.findMany()
  const searchQueue = queue<Book, void>(async (task, callback) => {
    if (task.id_ol_book) {
      const details = await getDetailsByBookId(task.id_ol_book)
      if (details) {
        console.log(`updating ${task.title}`)
        await prisma.book.update({
          where: {
            id: task.id,
          },
          data: {
            id_ol_work: details.works[0].key.replace(/^\/?works\//, ''),
          },
        })
      }
    }
    callback()
  })
  books.forEach((book) => searchQueue.push(book))
  searchQueue.drain(async function () {
    await prisma.$disconnect()
  })
}

async function findDescriptions(): Promise<void> {
  const books = await prisma.book.findMany()
  const searchQueue = queue<Book, void>(async (task, callback) => {
    if (task.id_ol_work) {
      console.log(`updating ${task.title}`)
      const details = await getDetailsByWorkId(task.id_ol_work)
      if (details) {
        await prisma.book.update({
          where: {
            id: task.id,
          },
          data: {
            description: details.description?.value || undefined,
          },
        })
      }
    }
    callback()
  })
  books.forEach((book) => searchQueue.push(book))
  searchQueue.drain(async function () {
    await prisma.$disconnect()
  })
}

async function addGenreTags(): Promise<void> {
  const addQueue = queue<string, void>(async (task, callback) => {
    console.log(`adding ${task}`)
    await prisma.tag.create({
      data: {
        type: 'genre',
        slug: task.replace(/\s+/g, '-'),
        name: task,
      },
    })
    callback()
  })
  genres.forEach((genre) => addQueue.push(genre))
  addQueue.drain(async function () {
    await prisma.$disconnect()
  })
}

async function downloadCovers(): Promise<void> {
  const books = await prisma.book.findMany()
  const downloadQueue = queue<Book, void>(async (task, callback) => {
    if (task.isbn) {
      console.log(`downloading image for ${task.title}`)
      const details = await getDetailsByIsbn(task.isbn)
      if (details?.cover?.large) {
        const { id } = task
        const folder1 = id.substr(-2)
        const folder2 = id.substr(-4, 2)
        const path = `./data/images/${folder1}/${folder2}/${id}.jpg`
        downloadImage(details.cover.large, path)
      }
    }
    callback()
  })
  books.forEach((book) => downloadQueue.push(book))
  downloadQueue.drain(async function () {
    await prisma.$disconnect()
  })
}

async function onEnd(): Promise<void> {
  await prisma.$disconnect()
}

async function main(): Promise<void> {
  // await forEachRowIn('./data/books.search.csv', onRow, { onEnd: onEnd })
  // await findWorkIds()
  // await findDescriptions()
  // await addGenreTags()
  await downloadCovers()
}

main().catch((e) => console.error(e))
