import { Command } from './index.types'
import { getBook, getUpdatedSlugs } from '../book'
import Books from '../books'
import { eachLimit } from 'async'
import { syncAddBook, syncRemoveBooks, syncUpdateBook } from './sync.private'

const command: Command = {
  name: 'sync',

  command: 'sync',

  describe: 'sync directory to local database',

  run: async function (ctx) {
    const dir = ctx.directory
    const books = new Books(dir)
    const bookSlugs = await books.getAllSlugs()
    const force = ctx.flags.force
    const updatedBookSlugs = force
      ? bookSlugs
      : await getUpdatedSlugs(bookSlugs, books, 'lastSynced')

    await eachLimit(updatedBookSlugs, 1, async (slug) => {
      const bookMd = await getBook(books, slug)
      if (bookMd) {
        const cache = await books.cache.get(slug)
        if (cache.database?.id) {
          await syncUpdateBook(ctx, books, bookMd, cache.database.id)
        } else {
          await syncAddBook(ctx, books, bookMd)
        }
      }
    })

    await syncRemoveBooks(ctx, bookSlugs)
  },
}

export default command
