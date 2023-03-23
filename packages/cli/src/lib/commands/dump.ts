import { Command, Context } from './utils/types'
import { Book } from '../prisma'
import { writeBookMd, bookToMd, Books } from '../books'
import { eachLimit } from 'async'
import { cpus } from 'os'

async function dumpBook(ctx: Context, book: Book): Promise<void> {
  const dir = ctx.directory

  try {
    if (ctx.flags.dryRun === false) {
      const books = new Books(dir)
      const bookMd = await bookToMd(book)

      await writeBookMd(books, bookMd)
    }
    ctx.log.info(`saved book to ${book.slug}.md`)
  } catch (e) {
    ctx.log.error(`error saving ${book.slug}`)
  }
}

const command: Command = {
  name: 'dump',

  command: 'dump',

  describe: 'dump database to local markdown files',

  run: async function (ctx) {
    const books = await ctx.prisma.book.findMany()
    const numCpus = cpus().length

    await eachLimit(books, numCpus, async (book) => {
      await dumpBook(ctx, book)
    })
  },
}

export default command
