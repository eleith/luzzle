import got from 'got'
import log from './log'

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
  subject?: Array<string>
  place?: Array<string>
  cover_i?: number
  covers?: Array<number>
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

const OPEN_LIBRARY_SEARCH_ENDPOINT = 'https://openlibrary.org/search.json'

async function search(title: string, author: string): Promise<Array<OpenLibrarySearchWork>> {
  try {
    // ! trips up open library search
    // : or . indicates subtitle and trips up open library search
    // , indicates multiple authors and trips up open library search
    const response = await got.get<OpenLibraryResponseSearch>(OPEN_LIBRARY_SEARCH_ENDPOINT, {
      searchParams: {
        title: title.replace(/:.+/g, '').replace(/!/g, ''),
        author: author.replace(/,.+/g, '').replace(/!/g, ''),
      },
      responseType: 'json',
    })

    if (response.statusCode === 200 && response.body.num_found > 0) {
      return response.body.docs.filter((item) => item.type === 'work')
    }

    log.warn('open-library', `search returned http: ${response.statusCode}`)
  } catch (e) {
    log.error('open-library', e as string)
  }

  return []
}

async function findWork(id: string): Promise<OpenLibrarySearchWork | null> {
  try {
    const response = await got.get<OpenLibraryResponseSearch>(OPEN_LIBRARY_SEARCH_ENDPOINT, {
      searchParams: {
        q: id,
      },
      responseType: 'json',
    })

    if (response.statusCode === 200 && response.body.num_found > 0) {
      return response.body.docs.filter((item) => item.type === 'work')[0]
    }

    log.warn('open-library', `findWork returned http: ${response.statusCode}`)
  } catch (e) {
    log.error('open-library', e as string)
  }

  return null
}

async function getWork(workId: string): Promise<OpenLibraryWork | null> {
  try {
    const response = await got.get<OpenLibraryWork>(
      `https://openlibrary.org/works/${workId}.json`,
      { responseType: 'json' }
    )

    if (response.statusCode === 200) {
      return response.body
    }

    log.warn('open-library', `getWork returned http: ${response.statusCode}`)
  } catch (e) {
    log.error('open-library', e as string)
  }

  return null
}

const getBook = async (bookId: string): Promise<OpenLibraryBook | null> => {
  try {
    const response = await got.get<OpenLibraryBook>(
      `https://openlibrary.org/books/${bookId}.json`,
      { responseType: 'json' }
    )

    if (response.statusCode === 200) {
      return response.body
    }

    log.warn('open-library', `getBook returned http: ${response.statusCode}`)
  } catch (e) {
    log.error('open-library', e as string)
  }

  return null
}

function getCoverUrl(id: number, size: 'L' | 'M' | 'S' = 'L'): string {
  return `http://covers.openlibrary.org/b/id/${id}-${size}.jpg`
}

export { search, getWork, getBook, findWork, getCoverUrl }
