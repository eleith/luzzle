import { Command, Context } from './utils/types.js'
import { writeBookMd, bookToMd, Books } from '../books/index.js'
import { eachLimit } from 'async'
import { cpus } from 'os'
import { Book } from '@luzzle/kysely'

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
		const books = await ctx.db.selectFrom('books').selectAll().execute()
		const numCpus = cpus().length

		await eachLimit(books, numCpus, async (book) => {
			await dumpBook(ctx, book)
		})
	},
}

export default command
