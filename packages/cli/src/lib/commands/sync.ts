import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { eachLimit } from 'async'

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
		const force = args.force
		const dryRun = ctx.flags.dryRun
		const pieceTypes = ctx.pieces.getPieceTypes()

		await eachLimit(pieceTypes, 1, async (pieceType) => {
			const pieces = await ctx.pieces.getPiece(pieceType)
			const slugs = await pieces.getSlugs()
			const updatedSlugs = force ? slugs : await pieces.filterSlugsBy(slugs, 'lastSynced')

			await pieces.sync(ctx.db, updatedSlugs, dryRun)
			await pieces.syncCleanUp(ctx.db, slugs, dryRun)
		})
	},
}

export default command
