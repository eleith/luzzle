import log from '../log.js'
import { Command, Context } from './utils/types.js'
import { Argv } from 'yargs'
import {
	getBook,
	processBookMd,
	getUpdatedSlugs,
	cleanUpDerivatives,
	writeBookMd,
	Books,
	BookMd,
} from '../books/index.js'
import { eachLimit } from 'async'

export type ProcessArgv = { force: boolean }

async function processBook(ctx: Context, books: Books, bookMd: BookMd): Promise<void> {
	if (ctx.flags.dryRun === false) {
		const bookProcessed = await processBookMd(bookMd)
		await writeBookMd(books, bookProcessed)
	}

	log.info(`processed ${bookMd.filename}`)
}

const command: Command<ProcessArgv> = {
	name: 'process',

	command: 'process',

	describe: 'process files',

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
		const books = new Books(dir)
		const bookSlugs = await books.getAllSlugs()
		const updatedBookSlugs = args.force
			? bookSlugs
			: await getUpdatedSlugs(bookSlugs, books, 'lastProcessed')

		await eachLimit(updatedBookSlugs, 1, async (slug) => {
			const bookMd = await getBook(books, slug)
			if (bookMd) {
				await processBook(ctx, books, bookMd)
			}
		})

		if (ctx.flags.dryRun === false) {
			await cleanUpDerivatives(books)
		}
	},
}

export default command
