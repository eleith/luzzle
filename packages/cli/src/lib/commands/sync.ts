import { Command } from './index.types'
import { getBook, readBookDir, getUpdatedSlugs, getBookCache } from '../book'
import { eachLimit } from 'async'
import { syncAddBook, syncRemoveBooks, syncUpdateBook } from './sync.private'

const command: Command = {
  name: 'sync',

  command: 'sync',

  describe: 'sync directory to local database',

  run: async function (ctx) {
    const dir = ctx.directory
    const bookSlugs = await readBookDir(dir)
    const force = ctx.flags.force
    const updatedBookSlugs = force ? bookSlugs : await getUpdatedSlugs(bookSlugs, dir, 'lastSynced')

    await eachLimit(updatedBookSlugs, 1, async (slug) => {
      const bookMd = await getBook(slug, dir)
      if (bookMd) {
        const cache = await getBookCache(dir, slug)
        if (cache.database?.id) {
          await syncUpdateBook(ctx, bookMd, cache.database.id)
        } else {
          await syncAddBook(ctx, bookMd)
        }
      }
    })

    await syncRemoveBooks(ctx, bookSlugs)
  },
}

export default command
