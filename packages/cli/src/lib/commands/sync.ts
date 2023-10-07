import { Command } from './utils/types.js'
import { eachLimit } from 'async'
import { syncAddBook, syncRemoveBooks, syncUpdateBook } from './sync.private.js'
import { Argv } from 'yargs'
import { BookPiece } from '../books/index.js'

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
		const bookPiece = new BookPiece(dir)
		const slugs = force ? await bookPiece.getSlugs() : await bookPiece.getSlugsUpdated('lastSynced')

		await eachLimit(slugs, 1, async (slug) => {
			const bookMd = await bookPiece.get(slug)
			if (bookMd) {
				const cache = await bookPiece.caches.get(slug)
				if (cache.database?.slug) {
					await syncUpdateBook(ctx, slug, bookPiece, bookMd, force)
				} else {
					await syncAddBook(ctx, slug, bookPiece, bookMd)
				}
			}
		})

		await syncRemoveBooks(ctx, slugs)
	},
}

export default command
