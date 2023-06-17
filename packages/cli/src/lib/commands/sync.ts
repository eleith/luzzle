import { Command } from './utils/types.js'
import { getBook, getUpdatedSlugs, Books } from '../books/index.js'
import { eachLimit } from 'async'
import { syncAddBook, syncRemoveBooks, syncUpdateBook } from './sync.private.js'
import { Argv } from 'yargs'

export type SyncArgv = { force: boolean }

const command: Command<SyncArgv> = {
  name: 'sync',

  command: 'sync',

  describe: 'sync directory to local database',

  builder: <T>(yargs: Argv<T>) => {
    return yargs.options('force', {
      type: 'boolean',
      alias: 'f',
      description: 'force updates on all items',
      default: false,
    })
  },

  run: async function (ctx, args) {
    const dir = ctx.directory
    const force = args.force
    const books = new Books(dir)
    const bookSlugs = await books.getAllSlugs()
    const updatedBookSlugs = force
      ? bookSlugs
      : await getUpdatedSlugs(bookSlugs, books, 'lastSynced')

    await eachLimit(updatedBookSlugs, 1, async (slug) => {
      const bookMd = await getBook(books, slug)
      if (bookMd) {
        const cache = await books.cache.get(slug)
        if (cache.database?.id) {
          await syncUpdateBook(ctx, books, bookMd, cache.database.id, force)
        } else {
          await syncAddBook(ctx, books, bookMd)
        }
      }
    })

    await syncRemoveBooks(ctx, bookSlugs)
  },
}

export default command
