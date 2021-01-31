import { PrismaClient, Prisma } from '@prisma/client'
import { getDetailsByIsbn, OpenLibraryResponseBook } from './openlibrary.js'
import { forEachRowIn, BookRow } from './books-csv.js'

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
  details: OpenLibraryResponseBook
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
    ? new Date(details.publish_date).getUTCFullYear()
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
    year_published: publishedYear,
    keywords,
  }
}

async function onRow(book: BookRow): Promise<void> {
  if (book.isbn) {
    const details = await getDetailsByIsbn(book.isbn)
    if (details) {
      const info = openLibraryResponseBookToBookUpdateInput(book, details)

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

async function main(): Promise<void> {
  await forEachRowIn('./data/books.search.csv', onRow)
}

await main().catch((e) => console.error(e))
