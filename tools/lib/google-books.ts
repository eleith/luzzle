import { books_v1, google } from 'googleapis'
import { config } from 'dotenv'

config()

const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY
const googleBooks = google.books({ version: 'v1', auth: googleBooksApiKey })

async function findVolumeByIsbn(isbn: string): Promise<books_v1.Schema$Volume | null> {
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

// async function searchBook(title: string, author: string): Promise<> {
//   const volume = await findVolume(title, author)
//   const googleBook = volume?.volumeInfo
// 
//   if (googleBook) {
//     const title = googleBook.title || bookMd.frontmatter.title
//     const subtitle = googleBook.subtitle
//     const authors = googleBook.authors || []
//     const author = authors[0] || bookMd.frontmatter.author
//     const coauthors = authors.slice(1).join(',')
//     const categories = googleBook.categories || []
//     const keywords = categories.map((x) => x.toLowerCase()).join(',')
//     const pages = googleBook.pageCount
//     const description = googleBook.description
// 
//     return {
//       title,
//       author,
//       subtitle,
//       coauthors,
//       keywords,
//       pages,
//       description,
//     }
//   }
// 
//   return null
// }

export { findVolumeByIsbn, findVolumes, findVolume }
