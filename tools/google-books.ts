import { books_v1, google } from 'googleapis'
import { config } from 'dotenv'

config()

const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY
const googleBooks = google.books({ version: 'v1', auth: googleBooksApiKey })

async function getDetailsByIsbn(isbn: string): Promise<books_v1.Schema$Volume | null> {
  const response = await googleBooks.volumes.list({ q: `isbn:${isbn}` })

  if (response.status === 200 && response.data.items?.length) {
    return response.data.items[0]
  }
  return null
}

export { getDetailsByIsbn }
