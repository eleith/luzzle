import { readdir } from 'fs/promises'
import path from 'path'
import { ASSETS_DIRECTORY } from '../assets'
import { BookDatabaseCache, cacheDatabaseSchema } from './book.schemas'
import CacheForType from '../cache'

const BOOK_DIRECTORY = 'books'
const BOOK_COVER_DIRECTORY = path.join(ASSETS_DIRECTORY, 'covers')

class Books {
  private rootDir: string
  public cache: CacheForType<BookDatabaseCache>

  static getRelativePathForBookCover(slug: string): string {
    return path.join(BOOK_COVER_DIRECTORY, `${slug}.jpg`)
  }

  constructor(dir: string) {
    this.rootDir = path.join(dir, BOOK_DIRECTORY)
    this.cache = new CacheForType<BookDatabaseCache>(cacheDatabaseSchema, this.rootDir)
  }

  getPathForBookCover(slug: string): string {
    return path.join(this.rootDir, BOOK_COVER_DIRECTORY, `${slug}.jpg`)
  }

  getPathForBook(slug: string): string {
    return path.join(this.rootDir, `${slug}.md`)
  }

  async getAllSlugs(): Promise<string[]> {
    const files = await readdir(this.rootDir, { withFileTypes: true })
    return files
      .filter((dirent) => dirent.isFile() && path.extname(dirent.name) === '.md')
      .map((dirent) => path.basename(dirent.name, '.md'))
  }
}

export default Books
