import axios from 'axios'

export interface OpenLibrarySearchBook {
  isbn: Array<string>
  title: string
  author_name: Array<string>
}

export interface OpenLibraryResponseSearch {
  start: number
  num_found: number
  docs: Array<OpenLibrarySearchBook>
}

export interface OpenLibraryResponseBooks {
  authors: Array<{ url: string; name: string }>
  cover: { large: string }
  url: string
  subtitle?: string
  title: string
  publish_date?: string
  number_of_pages?: number
  subjects?: Array<{ name: string; url: string }>
  identifiers: { openlibrary: Array<string> }
  subject_places?: Array<{ name: string; url: string }>
  key: string
}

export interface OpenLibraryResponseWork {
  description?: { type: string; value: string }
}

export interface OpenLibraryResponseBook {
  works: Array<{ key: string }>
}

async function findIsbn(title: string, author: string): Promise<string | null> {
  const response = await axios.get<OpenLibraryResponseSearch>(
    'http://openlibrary.org/search.json',
    {
      params: {
        title: title.replace(/:.+/g, '').replace(/!/g, ''),
        author: author.replace(/,.+/g, '').replace(/!/g, ''),
      },
    }
  )

  if (response.status === 200 && response.data.num_found > 0 && response.data.docs[0].isbn) {
    const bookSearchDocs = response.data.docs[0]
    return bookSearchDocs.isbn?.reduce((accumulator, currentValue) => {
      return accumulator.length > currentValue.length ? accumulator : currentValue
    })
  }

  return null
}

async function getDetailsByIsbn(isbn: string): Promise<OpenLibraryResponseBooks | null> {
  const response = await axios.get<{ [key: string]: OpenLibraryResponseBooks }>(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
  )

  const key = `ISBN:${isbn}`

  if (response.status === 200 && response.data[key]) {
    return response.data[key]
  }

  return null
}

async function getDetailsByWorkId(workId: string): Promise<OpenLibraryResponseWork | null> {
  const response = await axios.get<OpenLibraryResponseWork>(
    `https://openlibrary.org/works/${workId}.json`
  )

  if (response.status === 200) {
    return response.data
  }

  return null
}

async function getDetailsByBookId(bookId: string): Promise<OpenLibraryResponseBook | null> {
  const response = await axios.get<OpenLibraryResponseBook>(
    `https://openlibrary.org/books/${bookId}.json`
  )

  if (response.status === 200) {
    return response.data
  }

  return null
}

export { findIsbn, getDetailsByIsbn, getDetailsByWorkId, getDetailsByBookId }
