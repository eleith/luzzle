import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { eachLimit } from 'async'
import { BookPiece } from '../books/index.js'

export type ProcessArgv = { force: boolean }

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
		const bookPiece = new BookPiece(dir)

		const slugs = args.force
			? await bookPiece.getSlugs()
			: await bookPiece.getSlugsUpdated('lastProcessed')

		if (ctx.flags.dryRun === false) {
			await eachLimit(slugs, 1, async (slug) => {
				await bookPiece.process(slug)
			})

			await bookPiece.removeStaleCache()
		}
	},
}

export default command
