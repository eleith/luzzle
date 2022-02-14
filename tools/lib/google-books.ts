import { books_v1, google } from 'googleapis'
import { config } from 'dotenv'

config()

/* c8 ignore start */
function _getGoogleBooks(): books_v1.Books {
  const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY
  return google.books({ version: 'v1', auth: googleBooksApiKey })
}
/* c8 ignore stop */

async function findVolumeByIsbn(isbn: string): Promise<books_v1.Schema$Volume | null> {
  const googleBooks = _private._getGoogleBooks()
  const response = await googleBooks.volumes.list({ q: `isbn:${isbn}` })

  if (response.status === 200 && response.data.items?.length) {
    return response.data.items[0]
  }
  return null
}

async function findVolumes(
  title: string,
  author: string
): Promise<books_v1.Schema$Volume[] | null> {
  const googleBooks = _private._getGoogleBooks()
  const response = await googleBooks.volumes.list({ q: `${title} ${author}` })

  if (response.status === 200 && response.data.items?.length) {
    return response.data.items
  }

  return null
}

async function findVolume(title: string, author: string): Promise<books_v1.Schema$Volume | null> {
  const books = await findVolumes(title, author)
  return books?.[0] || null
}

const _private = {
  _getGoogleBooks,
}

export { findVolumeByIsbn, findVolumes, findVolume, _private }
