import got from 'got'

interface OpenLibraryResponseSearch {
  start: number
  num_found: number
  docs: Array<OpenLibrarySearchWork>
}

export interface OpenLibrarySearchWork {
  key: string
  title: string
  publish_year: Array<string>
  number_of_pages: string
  isbn?: Array<string>
  author_name: Array<string>
  subject: Array<string>
  place: Array<string>
  cover_i: number
  first_publish_year: number
  type: string
}

export interface OpenLibraryWork {
  description?: { type: string; value: string }
  subject_places: Array<string>
  subjects: Array<string>
  title: string
  covers: Array<number>
}

export interface OpenLibraryBook {
  authors: Array<{ key: string }>
  works?: Array<{ key: string }>
  covers: Array<number>
  isbn_13?: Array<string>
  isbn_10?: Array<string>
  number_of_pages: number
  publish_date: string
  title: string
  subtitle: string
  description: string
}

export type OpenLibraryWorkBook = OpenLibrarySearchWork & {
  subtitle?: string
  workId: string
  bookId: string
}

async function search(title: string, author: string): Promise<Array<OpenLibrarySearchWork>> {
  try {
    const response = await got.get<OpenLibraryResponseSearch>(
      'http://openlibrary.org/search.json',
      {
        searchParams: {
          title: title.replace(/:.+/g, '').replace(/!/g, ''),
          author: author.replace(/,.+/g, '').replace(/!/g, ''),
        },
      }
    )

    if (response.statusCode === 200 && response.body.num_found > 0) {
      return response.body.docs.filter((item) => item.type === 'work')
    }
  } catch (e) {
    console.log(e)
  }

  return []
}

async function findWork(id: string): Promise<OpenLibrarySearchWork | null> {
  try {
    const response = await got.get<OpenLibraryResponseSearch>(
      'http://openlibrary.org/search.json',
      {
        searchParams: {
          q: id,
        },
      }
    )

    if (response.statusCode === 200 && response.body.num_found > 0) {
      return response.body.docs.filter((item) => item.type === 'work')[0]
    }
  } catch (e) {
    console.log(e)
  }

  return null
}

async function getWork(workId: string): Promise<OpenLibraryWork | null> {
  try {
    const response = await got.get<OpenLibraryWork>(`https://openlibrary.org/works/${workId}.json`)

    if (response.statusCode === 200) {
      return response.body
    }
  } catch (e) {
    console.log(e)
  }

  return null
}

async function getBook(bookId: string): Promise<OpenLibraryBook | null> {
  try {
    const response = await got.get<OpenLibraryBook>(`https://openlibrary.org/books/${bookId}.json`)

    if (response.statusCode === 200) {
      return response.body
    }
  } catch (e) {
    console.log(e)
  }

  return null
}

function getCoverUrl(id: number, size: 'L' | 'M' | 'S' = 'L'): string {
  return `http://covers.openlibrary.org/b/id/${id}-${size}.jpg`
}

async function getWorkFromBook(bookId: string): Promise<OpenLibraryWorkBook | null> {
  const book = await getBook(bookId)
  if (book && book.works) {
    const workId = book.works[0].key.replace(/\/works\//, '')
    const openLibraryWork = await findWork(workId)

    if (openLibraryWork) {
      return {
        ...openLibraryWork,
        subtitle: book?.subtitle,
        workId,
        bookId,
      }
    }
  }
  return null
}

export { search, getWork, getBook, findWork, getCoverUrl, getWorkFromBook }
