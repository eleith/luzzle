import { Command, Context } from './utils/types.js'
import { eachLimit } from 'async'
import { cpus } from 'os'
import { Book } from '@luzzle/kysely'
import { BookPiece } from '../books/index.js'

async function dumpBook(ctx: Context, book: Book): Promise<void> {
	const dir = ctx.directory

	try {
		if (ctx.flags.dryRun === false) {
			const bookPiece = new BookPiece(dir)
			const markdown = await bookPiece.toMarkDown(book)

			await bookPiece.write(book.slug, markdown)
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
